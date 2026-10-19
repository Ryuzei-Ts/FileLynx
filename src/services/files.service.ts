import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveSafePath } from '#utils/paths';
import type { FileEntry } from '#types';

const execAsync = promisify(exec);

export const filesService = {
  async list(relativeDirectory: string = ''): Promise<(FileEntry & { hasGit?: boolean })[]> {
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

        return {
          name: entry.name,
          path: path.posix.join(relativeDirectory, entry.name),
          size: stats.size,
          isDirectory: entry.isDirectory(),
          modifiedAt: stats.mtime,
          extension: entry.isDirectory() ? undefined : path.extname(entry.name).toLowerCase(),
          hasGit,
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

  async importFromGitHub(repoUrl: string, targetSubPath: string, token?: string, branch?: string): Promise<void> {
    const targetFolder = resolveSafePath(targetSubPath);
    await fs.mkdir(targetFolder, { recursive: true });

    let cleanRepo = repoUrl.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    cleanRepo = cleanRepo.replace(/^github\.com\//, '').replace(/\.git$/, '');

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
      const sanitizedMsg = (err.message || '').replace(new RegExp(token || '___', 'g'), '***');
      throw new Error(sanitizedMsg);
    }
  },

  async gitPush(targetFolder: string, repoUrl: string, token: string, commitMsg: string = 'Update from FileLynx', branch: string = 'main'): Promise<string> {
    const safeDir = resolveSafePath(targetFolder);
    let cleanRepo = repoUrl.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    cleanRepo = cleanRepo.replace(/^github\.com\//, '').replace(/\.git$/, '');

    const [owner, repo] = cleanRepo.split('/');
    if (!owner || !repo) {
      throw new Error('URL de repositorio inválida');
    }

    const authRemote = `https://${encodeURIComponent(token.trim())}@github.com/${owner}/${repo}.git`;
    const cmd = `cd "${safeDir}" && git config user.name "FileLynx" && git config user.email "filelynx@local" && git remote remove origin 2>/dev/null || true && git remote add origin "${authRemote}" && git add -A && git commit -m "${commitMsg.replace(/"/g, '\\"')}" || true && git branch -M "${branch}" && git push -u origin "${branch}" --force`;
    
    const { stdout, stderr } = await execAsync(cmd);
    return stdout || stderr;
  },
};
