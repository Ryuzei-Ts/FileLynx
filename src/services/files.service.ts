import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { resolveSafePath } from '#utils/paths';
import type { FileEntry } from '#types';

export const filesService = {
  async list(relativeDirectory: string = ''): Promise<FileEntry[]> {
    const targetDir = resolveSafePath(relativeDirectory);
    const dirents = await fs.readdir(targetDir, { withFileTypes: true });

    const entries: FileEntry[] = await Promise.all(
      dirents.map(async (entry) => {
        const fullPath = path.join(targetDir, entry.name);
        const stats = await fs.stat(fullPath);
        return {
          name: entry.name,
          path: path.posix.join(relativeDirectory, entry.name),
          size: stats.size,
          isDirectory: entry.isDirectory(),
          modifiedAt: stats.mtime,
          extension: entry.isDirectory() ? undefined : path.extname(entry.name).toLowerCase(),
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
    const cleanRepo = repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
    const [owner, repo] = cleanRepo.split('/');
    if (!owner || !repo) throw new Error('Formato de repositorio inválido. Use usuario/repositorio');

    const ref = branch || 'main';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
    const headers: Record<string, string> = {
      'User-Agent': 'FileLynx-Client',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token && token.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      const fallbackUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
      const fallbackRes = await fetch(fallbackUrl, { headers });
      if (!fallbackRes.ok) {
        throw new Error(`Error de GitHub API (${fallbackRes.status}): ${fallbackRes.statusText}`);
      }
      return this.saveZipBuffer(fallbackRes, targetSubPath, repo);
    }

    return this.saveZipBuffer(response, targetSubPath, repo);
  },

  async saveZipBuffer(res: Response, targetSubPath: string, repoName: string): Promise<void> {
    const targetFolder = resolveSafePath(targetSubPath);
    await fs.mkdir(targetFolder, { recursive: true });
    const zipPath = path.join(targetFolder, `${repoName}.zip`);

    if (!res.body) throw new Error('Cuerpo de respuesta vacío desde GitHub');
    // @ts-ignore Node stream pipeline
    await pipeline(res.body, createWriteStream(zipPath));
  },
};
