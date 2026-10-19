import { describe, it, expect } from 'vitest';
import { filesService } from '#services/files';

describe('Files Service', () => {
  it('should list files in root directory without error', async () => {
    const list = await filesService.list('');
    expect(Array.isArray(list)).toBe(true);
  });
});
