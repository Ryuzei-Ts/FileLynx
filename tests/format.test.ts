import { describe, it, expect } from 'vitest';
import { formatBytes } from '#utils/format';

describe('Format Utility', () => {
  it('should format bytes properly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});
