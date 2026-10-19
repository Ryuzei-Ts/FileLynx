import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafePath } from '#utils/paths';
import type { FileEntry } from '#types';

export const searchService = {
  async search(query: string, subPath = ''): Promise<FileEntry[]> {
    const targetDir = resolveSafePath(subPath);
    const results: FileEntry[] = [];
    const lowerQuery = query.toLowerCase();

    async function walk(currentDir: string, currentRelative: string) {
      const dirents = await fs.readdir(currentDir, { withFileTypes: true });
      for (const ent of dirents) {
        const full = path.join(currentDir, ent.name);
        const rel = path.posix.join(currentRelative, ent.name);
        if (ent.name.toLowerCase().includes(lowerQuery)) {
          const stats = await fs.stat(full);
          results.push({
            name: ent.name,
            path: rel,
            size: stats.size,
            isDirectory: ent.isDirectory(),
            modifiedAt: stats.mtime,
            extension: ent.isDirectory() ? undefined : path.extname(ent.name).toLowerCase(),
          });
        }
        if (ent.isDirectory()) {
          await walk(full, rel);
        }
      }
    }

    await walk(targetDir, subPath);
    return results;
  },
};
