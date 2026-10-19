import { describe, it, expect } from 'vitest';
import { resolveSafePath } from '#utils/paths';

describe('Paths Utility', () => {
  it('should resolve safe path within root directory', () => {
    const resolved = resolveSafePath('subfolder/file.txt');
    expect(resolved).toContain('subfolder');
  });

  it('should prevent directory traversal attacks', () => {
    const traversal = resolveSafePath('../../../../etc/passwd');
    expect(traversal).not.toBe('/etc/passwd');
  });
});
