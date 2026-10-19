import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafePath } from '#utils/paths';
import type { FileEntry } from '#types';

export const filesService = {
  async list(relativeDirectory = ''): Promise<FileEntry[]> {
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

  async remove(relativeFilePath: string): Promise<void> {
    const safePath = resolveSafePath(relativeFilePath);
    await fs.rm(safePath, { recursive: true, force: true });
  },

  async createDirectory(relativeDirectory: string): Promise<void> {
    const safePath = resolveSafePath(relativeDirectory);
    await fs.mkdir(safePath, { recursive: true });
  },
};
