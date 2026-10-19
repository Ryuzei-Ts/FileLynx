import path from 'node:path';
import { config } from '#config';

export function resolveSafePath(userPath: string = ''): string {
  const root = path.resolve(config.ROOT_DIR);
  const sanitized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absoluteTarget = path.resolve(root, sanitized);

  if (!absoluteTarget.startsWith(root)) {
    throw new Error('Access denied: directory traversal detected');
  }

  return absoluteTarget;
}
