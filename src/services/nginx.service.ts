import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '#utils/logger';
import { resolveSafePath } from '#utils/paths';

const execAsync = promisify(exec);

export interface SubRoute {
  path: string;
  type: 'port' | 'path';
  target: string;
}

export interface DomainSite {
  domain: string;
  targetType: 'port' | 'path';
  target: string;
  hasSsl: boolean;
  enabled: boolean;
  subRoutes: SubRoute[];
}

export const nginxService = {
  getSitesAvailableDir(): string {
    return '/etc/nginx/sites-available';
  },

  getSitesEnabledDir(): string {
    return '/etc/nginx/sites-enabled';
  },

  async isNginxInstalled(): Promise<boolean> {
    try {
      await execAsync('which nginx');
      return true;
    } catch {
      return false;
    }
  },

  async getAvailablePort(startPort: number = 3100, maxPort: number = 9999): Promise<number> {
    function checkPort(port: number): Promise<boolean> {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on('error', () => resolve(false));
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve(true));
        });
      });
    }

    for (let p = startPort; p <= maxPort; p++) {
      const isFree = await checkPort(p);
      if (isFree) return p;
    }
    return 3100;
  },

  async ensureDefaultIpProxy(targetPort: number = 3000): Promise<void> {
    const isInstalled = await this.isNginxInstalled();
    if (!isInstalled) return;

    const availableDir = this.getSitesAvailableDir();
    const enabledDir = this.getSitesEnabledDir();
    const defaultAvailable = path.join(availableDir, 'default');
    const defaultEnabled = path.join(enabledDir, 'default');

    const defaultConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:${targetPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

    try {
      await fs.mkdir(availableDir, { recursive: true });
      await fs.mkdir(enabledDir, { recursive: true });

      let currentContent = '';
      try {
        currentContent = await fs.readFile(defaultAvailable, 'utf-8');
      } catch {}

      if (!currentContent.includes(`proxy_pass http://127.0.0.1:${targetPort};`) || !currentContent.includes('default_server')) {
        await fs.writeFile(defaultAvailable, defaultConfig, 'utf-8');

        try {
          await fs.unlink(defaultEnabled);
        } catch {}

        await fs.symlink(defaultAvailable, defaultEnabled);
        await execAsync('nginx -t && systemctl reload nginx');
      }
    } catch (err: any) {
      logger.warn('No se pudo auto-configurar Nginx default proxy:', err.message);
    }
  },

  async listDomains(): Promise<DomainSite[]> {
    await this.ensureDefaultIpProxy(3000);

    const availableDir = this.getSitesAvailableDir();
    const enabledDir = this.getSitesEnabledDir();
    const results: DomainSite[] = [];

    try {
      const files = await fs.readdir(availableDir);

      for (const file of files) {
        if (file === 'default' || !file.endsWith('.conf')) continue;

        const domain = file.replace('.conf', '');
        const filePath = path.join(availableDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        let targetType: 'port' | 'path' = 'port';
        let target = '3000';

        const rootPortMatch = content.match(/location\s+\/\s*\{[^}]*proxy_pass\s+http:\/\/(?:localhost|127\.0\.0\.1):(\d+);/);
        const rootPathMatch = content.match(/# Carpeta física vinculada: ([^\n]+)/);

        if (rootPortMatch && rootPortMatch[1]) {
          targetType = 'port';
          target = rootPortMatch[1];
        } else if (rootPathMatch && rootPathMatch[1]) {
          targetType = 'path';
          target = rootPathMatch[1].trim();
        }

        const hasSsl = content.includes('ssl_certificate') || content.includes('managed by Certbot');

        let enabled = false;
        try {
          await fs.access(path.join(enabledDir, file));
          enabled = true;
        } catch {}

        results.push({
          domain,
          targetType,
          target: target || '3000',
          hasSsl,
          enabled,
          subRoutes: [],
        });
      }
    } catch {}

    return results;
  },

  async createOrUpdateDomain(domain: string, targetType: 'port' | 'path', target: string): Promise<string> {
    await this.ensureDefaultIpProxy(3000);

    const cleanDomain = domain.trim().toLowerCase();
    const availableDir = this.getSitesAvailableDir();
    const enabledDir = this.getSitesEnabledDir();

    await fs.mkdir(availableDir, { recursive: true });
    await fs.mkdir(enabledDir, { recursive: true });

    const isSubdomain = cleanDomain.split('.').length > 2;
    const serverNames = isSubdomain ? cleanDomain : `${cleanDomain} www.${cleanDomain}`;

    let assignedPort = target;
    let rootBlock = '';

    if (targetType === 'path') {
      assignedPort = String(await this.getAvailablePort(3100, 9999));
      rootBlock = `
    # Carpeta física vinculada: ${resolveSafePath(target)}
    location / {
        proxy_pass http://127.0.0.1:${assignedPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`;
    } else {
      rootBlock = `
    location / {
        proxy_pass http://127.0.0.1:${target};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`;
    }

    const confFile = path.join(availableDir, `${cleanDomain}.conf`);
    const symlinkFile = path.join(enabledDir, `${cleanDomain}.conf`);

    let existingContent = '';
    try {
      existingContent = await fs.readFile(confFile, 'utf-8');
    } catch {}

    let configContent = '';
    if (existingContent && existingContent.includes('location / {')) {
      configContent = existingContent.replace(/server\s*\{[\s\S]*?\}/, `server {\n    listen 80;\n    server_name ${serverNames};\n${rootBlock}\n}`);
    } else {
      configContent = `server {
    listen 80;
    server_name ${serverNames};
${rootBlock}
}
`;
    }

    await fs.writeFile(confFile, configContent, 'utf-8');

    try {
      await fs.unlink(symlinkFile);
    } catch {}

    await fs.symlink(confFile, symlinkFile);
    await execAsync('nginx -t && systemctl reload nginx');

    return String(assignedPort);
  },

  async addSubRoute(domain: string, routePath: string, targetType: 'port' | 'path', target: string): Promise<string> {
    const cleanDomain = domain.trim().toLowerCase();
    let sanitizedPath = routePath.trim();
    if (!sanitizedPath.startsWith('/')) sanitizedPath = '/' + sanitizedPath;
    sanitizedPath = sanitizedPath.replace(/\/+$/, '');

    const confFile = path.join(this.getSitesAvailableDir(), `${cleanDomain}.conf`);
    let content = await fs.readFile(confFile, 'utf-8');

    let assignedPort = target;
    if (targetType === 'path') {
      assignedPort = String(await this.getAvailablePort(3100, 9999));
    }

    const routeBlock = `
    # ROUTE_START:${sanitizedPath}
    # TYPE:port
    # TARGET:${assignedPort}
    location ^~ ${sanitizedPath}/ {
        proxy_pass http://127.0.0.1:${assignedPort}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = ${sanitizedPath} {
        return 301 ${sanitizedPath}/;
    }
    # ROUTE_END:${sanitizedPath}
`;

    const cleanRegex = new RegExp(`\\s*# ROUTE_START:${sanitizedPath}[\\s\\S]*?# ROUTE_END:${sanitizedPath}`, 'g');
    content = content.replace(cleanRegex, '');

    const insertIndex = content.indexOf('location / {');
    if (insertIndex !== -1) {
      content = content.slice(0, insertIndex) + routeBlock + '\n    ' + content.slice(insertIndex);
    } else {
      const lastBrace = content.lastIndexOf('}');
      content = content.slice(0, lastBrace) + routeBlock + '\n' + content.slice(lastBrace);
    }

    await fs.writeFile(confFile, content, 'utf-8');
    await execAsync('nginx -t && systemctl reload nginx');

    return String(assignedPort);
  },

  async removeSubRoute(domain: string, routePath: string): Promise<void> {
    const cleanDomain = domain.trim().toLowerCase();
    let sanitizedPath = routePath.trim();
    if (!sanitizedPath.startsWith('/')) sanitizedPath = '/' + sanitizedPath;
    sanitizedPath = sanitizedPath.replace(/\/+$/, '');

    const confFile = path.join(this.getSitesAvailableDir(), `${cleanDomain}.conf`);
    let content = await fs.readFile(confFile, 'utf-8');

    const cleanRegex = new RegExp(`\\s*# ROUTE_START:${sanitizedPath}[\\s\\S]*?# ROUTE_END:${sanitizedPath}`, 'g');
    content = content.replace(cleanRegex, '');

    await fs.writeFile(confFile, content, 'utf-8');
    await execAsync('nginx -t && systemctl reload nginx');
  },

  async issueSsl(domain: string, email: string): Promise<string> {
    const cleanDomain = domain.trim().toLowerCase();
    const cleanEmail = email && email.trim() ? email.trim() : 'admin@' + cleanDomain;

    const isSubdomain = cleanDomain.split('.').length > 2;
    const domainFlags = isSubdomain ? `-d ${cleanDomain}` : `-d ${cleanDomain} -d www.${cleanDomain}`;

    const cmd = `certbot --nginx ${domainFlags} --non-interactive --agree-tos -m ${cleanEmail} --redirect`;
    const { stdout, stderr } = await execAsync(cmd);
    await execAsync('systemctl reload nginx');
    return stdout || stderr;
  },

  async deleteDomain(domain: string): Promise<void> {
    const cleanDomain = domain.trim().toLowerCase();
    const confFile = path.join(this.getSitesAvailableDir(), `${cleanDomain}.conf`);
    const symlinkFile = path.join(this.getSitesEnabledDir(), `${cleanDomain}.conf`);

    try {
      await fs.unlink(symlinkFile);
    } catch {}

    try {
      await fs.unlink(confFile);
    } catch {}

    await execAsync('nginx -t && systemctl reload nginx');
  },
};
