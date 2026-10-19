import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveSafePath } from '#utils/paths';
import type { FileEntry } from '#types';

const execAsync = promisify(exec);

export const filesService = {
  async list(relativeDirectory: string = ''): Promise<(FileEntry & { hasGit?: boolean; isArchive?: boolean })[]> {
    const targetDir = resolveSafePath(relativeDirectory);
    const dirents = await fs.readdir(targetDir, { withFileTypes: true });

    const entries = await Promise.all(
      dirents.map(async (entry) => {
        const fullPath = path.join(targetDir, entry.name);
        const stats = await fs.stat(fullPath);
        let hasGit = false;

        if (entry.isDirectory()) {
          try {
            await fs.access(path.join(fullPath, '.git'));
            hasGit = true;
          } catch {
            hasGit = false;
          }
        }

        const ext = entry.isDirectory() ? undefined : path.extname(entry.name).toLowerCase();
        const isArchive = Boolean(ext && ['.zip', '.tar', '.gz', '.tgz'].includes(ext));

        return {
          name: entry.name,
          path: path.posix.join(relativeDirectory, entry.name),
          size: stats.size,
          isDirectory: entry.isDirectory(),
          modifiedAt: stats.mtime,
          extension: ext,
          hasGit,
          isArchive,
        };
      })
    );

    return entries.sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));
  },

  async read(relativeFilePath: string): Promise<string> {
    const safePath = resolveSafePath(relativeFilePath);
    return fs.readFile(safePath, 'utf-8');
  },

  async write(relativeFilePath: string, content: string): Promise<void> {
    const safePath = resolveSafePath(relativeFilePath);
    await fs.writeFile(safePath, content, 'utf-8');
  },

  async createFile(relativeFilePath: string, content: string = ''): Promise<void> {
    const safePath = resolveSafePath(relativeFilePath);
    await fs.writeFile(safePath, content, { flag: 'wx' });
  },

  async rename(oldRelativePath: string, newRelativePath: string): Promise<void> {
    const oldSafe = resolveSafePath(oldRelativePath);
    const newSafe = resolveSafePath(newRelativePath);
    await fs.rename(oldSafe, newSafe);
  },

  async move(sourcePath: string, destinationDir: string): Promise<void> {
    const srcSafe = resolveSafePath(sourcePath);
    const destDirSafe = resolveSafePath(destinationDir);
    const fileName = path.basename(srcSafe);
    const targetPath = path.join(destDirSafe, fileName);
    await fs.rename(srcSafe, targetPath);
  },

  async remove(relativeFilePath: string): Promise<void> {
    const safePath = resolveSafePath(relativeFilePath);
    await fs.rm(safePath, { recursive: true, force: true });
  },

  async createDirectory(relativeDirectory: string): Promise<void> {
    const safePath = resolveSafePath(relativeDirectory);
    await fs.mkdir(safePath, { recursive: true });
  },

  getDownloadStream(relativeFilePath: string) {
    const safePath = resolveSafePath(relativeFilePath);
    return createReadStream(safePath);
  },

  async compress(sourceRelativePath: string, format: 'zip' | 'tar.gz' = 'zip'): Promise<string> {
    const safeSrc = resolveSafePath(sourceRelativePath);
    const parentDir = path.dirname(safeSrc);
    const baseName = path.basename(safeSrc);

    if (format === 'zip') {
      try {
        const archiveName = `${baseName}.zip`;
        await execAsync(`cd "${parentDir}" && zip -r -q "${archiveName}" "${baseName}"`);
        return archiveName;
      } catch (err: any) {
        const tarName = `${baseName}.tar.gz`;
        await execAsync(`cd "${parentDir}" && tar -czf "${tarName}" "${baseName}"`);
        return tarName;
      }
    } else {
      const archiveName = `${baseName}.tar.gz`;
      await execAsync(`cd "${parentDir}" && tar -czf "${archiveName}" "${baseName}"`);
      return archiveName;
    }
  },

  async extract(archiveRelativePath: string, destinationDir?: string): Promise<void> {
    const safeArchive = resolveSafePath(archiveRelativePath);
    const targetDest = destinationDir ? resolveSafePath(destinationDir) : path.dirname(safeArchive);
    const ext = safeArchive.toLowerCase();

    if (ext.endsWith('.zip')) {
      try {
        await execAsync(`unzip -o -q "${safeArchive}" -d "${targetDest}"`);
      } catch (err: any) {
        await execAsync(`python3 -c "import zipfile; zipfile.ZipFile('${safeArchive}').extractall('${targetDest}')"`);
      }
    } else if (ext.endsWith('.tar.gz') || ext.endsWith('.tgz')) {
      await execAsync(`tar -xzf "${safeArchive}" -C "${targetDest}"`);
    } else if (ext.endsWith('.tar')) {
      await execAsync(`tar -xf "${safeArchive}" -C "${targetDest}"`);
    } else {
      throw new Error('Formato no soportado. Usa .zip, .tar.gz o .tar');
    }
  },

  async getGitConfigInfo(folderPath: string): Promise<{ remoteUrl: string; branch: string; hasGit: boolean }> {
    const safeDir = resolveSafePath(folderPath);
    const configPath = path.join(safeDir, '.git', 'config');

    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const urlMatch = configData.match(/url\s*=\s*(.+)/);
      let branch = 'main';

      try {
        const headData = await fs.readFile(path.join(safeDir, '.git', 'HEAD'), 'utf-8');
        const headMatch = headData.match(/ref:\s*refs\/heads\/(.+)/);
        if (headMatch) branch = headMatch[1].trim();
      } catch {}

      return {
        hasGit: true,
        remoteUrl: urlMatch ? urlMatch[1].trim() : '',
        branch,
      };
    } catch {
      return { hasGit: false, remoteUrl: '', branch: 'main' };
    }
  },

  async importFromGitHub(repoUrl: string, targetSubPath: string, token?: string, branch?: string): Promise<void> {
    const targetFolder = resolveSafePath(targetSubPath);
    await fs.mkdir(targetFolder, { recursive: true });

    let cleanRepo = repoUrl.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    cleanRepo = cleanRepo.replace(/^[^@]+@github\.com\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '');

    const [owner, repo] = cleanRepo.split('/');
    if (!owner || !repo) {
      throw new Error('Formato de repositorio inválido. Debe ser: usuario/repositorio');
    }

    const cloneUrl = token && token.trim()
      ? `https://${encodeURIComponent(token.trim())}@github.com/${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`;

    const branchArg = branch && branch.trim() ? `--branch ${branch.trim()}` : '';
    const destinationPath = path.join(targetFolder, repo);

    const cmd = `git clone --depth 1 ${branchArg} "${cloneUrl}" "${destinationPath}"`;
    try {
      await execAsync(cmd);
    } catch (err: any) {
      if (err.message && (err.message.includes('could not read Username') || err.message.includes('Authentication failed'))) {
        throw new Error('PRIVATE_REPO_AUTH_REQUIRED');
      }
      const sanitizedMsg = (err.message || '').replace(new RegExp(token || '___', 'g'), '***');
      throw new Error(sanitizedMsg);
    }
  },

  async gitPull(targetFolder: string, repoUrl?: string, token?: string, branch?: string): Promise<string> {
    const safeDir = resolveSafePath(targetFolder);
    const gitInfo = await this.getGitConfigInfo(targetFolder);

    const finalRepoUrl = repoUrl && repoUrl.trim() ? repoUrl.trim() : gitInfo.remoteUrl;
    const finalBranch = branch && branch.trim() ? branch.trim() : (gitInfo.branch || 'main');

    let setRemoteCmd = '';
    if (token && token.trim() && finalRepoUrl) {
      let clean = finalRepoUrl.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      clean = clean.replace(/^[^@]+@github\.com\//, 'github.com/').replace(/^github\.com\//, '').replace(/\.git$/, '');
      const authRemote = `https://${encodeURIComponent(token.trim())}@github.com/${clean}.git`;
      setRemoteCmd = `git remote set-url origin "${authRemote}" && `;
    }

    try {
      const step1 = `cd "${safeDir}" && ${setRemoteCmd}git pull origin "${finalBranch}"`;
      const { stdout, stderr } = await execAsync(step1);
      return stdout || stderr;
    } catch (err: any) {
      if (err.message && (err.message.includes('could not read Username') || err.message.includes('Authentication failed'))) {
        throw new Error('AUTH_REQUIRED');
      }

      const step2 = `cd "${safeDir}" && git merge --abort 2>/dev/null || true && git fetch origin "${finalBranch}" && git reset --hard origin/"${finalBranch}"`;
      const { stdout, stderr } = await execAsync(step2);
      return stdout || stderr;
    }
  },
};
