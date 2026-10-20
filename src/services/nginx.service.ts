import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '#utils/logger';

const execAsync = promisify(exec);

export interface SubRoute {
  path: string;
  targetPort: number;
}

export interface DomainSite {
  domain: string;
  targetPort: number;
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
        logger.info(`Nginx default proxy configurado al puerto ${targetPort}`);
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

        const rootPortMatch = content.match(/location\s+\/\s*\{[^}]*proxy_pass\s+http:\/\/(?:localhost|127\.0\.0\.1):(\d+);/);
        const targetPort = rootPortMatch ? parseInt(rootPortMatch[1], 10) : 3000;
        const hasSsl = content.includes('ssl_certificate') || content.includes('managed by Certbot');

        let enabled = false;
        try {
          await fs.access(path.join(enabledDir, file));
          enabled = true;
        } catch {}

        const subRoutes: SubRoute[] = [];
        const locationRegex = /location\s+(?:\^~\s*)?(\/[a-zA-Z0-9_\-\/]+)\/\s*\{[^}]*proxy_pass\s+http:\/\/(?:localhost|127\.0\.0\.1):(\d+)\/?;/g;
        let match;
        while ((match = locationRegex.exec(content)) !== null) {
          const matchedPath = match[1];
          if (matchedPath !== '/') {
            subRoutes.push({
              path: matchedPath,
              targetPort: parseInt(match[2], 10),
            });
          }
        }

        results.push({
          domain,
          targetPort,
          hasSsl,
          enabled,
          subRoutes,
        });
      }
    } catch {}

    return results;
  },

  async createDomainProxy(domain: string, targetPort: number): Promise<void> {
    await this.ensureDefaultIpProxy(3000);

    const cleanDomain = domain.trim().toLowerCase();
    const availableDir = this.getSitesAvailableDir();
    const enabledDir = this.getSitesEnabledDir();

    await fs.mkdir(availableDir, { recursive: true });
    await fs.mkdir(enabledDir, { recursive: true });

    const isSubdomain = cleanDomain.split('.').length > 2;
    const serverNames = isSubdomain ? cleanDomain : `${cleanDomain} www.${cleanDomain}`;

    const configContent = `server {
    listen 80;
    server_name ${serverNames};

    location / {
        proxy_pass http://127.0.0.1:${targetPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

    const confFile = path.join(availableDir, `${cleanDomain}.conf`);
    const symlinkFile = path.join(enabledDir, `${cleanDomain}.conf`);

    await fs.writeFile(confFile, configContent, 'utf-8');

    try {
      await fs.unlink(symlinkFile);
    } catch {}

    await fs.symlink(confFile, symlinkFile);
    await execAsync('nginx -t && systemctl reload nginx');
  },

  async addSubRoute(domain: string, routePath: string, targetPort: number): Promise<void> {
    const cleanDomain = domain.trim().toLowerCase();
    let sanitizedPath = routePath.trim();
    if (!sanitizedPath.startsWith('/')) sanitizedPath = '/' + sanitizedPath;
    sanitizedPath = sanitizedPath.replace(/\/+$/, '');

    const confFile = path.join(this.getSitesAvailableDir(), `${cleanDomain}.conf`);
    let content = await fs.readFile(confFile, 'utf-8');

    const locationBlock = `
    # ROUTE_START:${sanitizedPath}
    location ^~ ${sanitizedPath}/ {
        proxy_pass http://127.0.0.1:${targetPort}/;
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
      content = content.slice(0, insertIndex) + locationBlock + '\n    ' + content.slice(insertIndex);
    } else {
      const lastBrace = content.lastIndexOf('}');
      content = content.slice(0, lastBrace) + locationBlock + '\n' + content.slice(lastBrace);
    }

    await fs.writeFile(confFile, content, 'utf-8');
    await execAsync('nginx -t && systemctl reload nginx');
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
