import { describe, it, expect } from 'vitest';
import { authService } from '#services/auth';

describe('Auth Service', () => {
  it('should return null for invalid user credentials', () => {
    const result = authService.login('non_existent', 'invalid_pwd');
    expect(result).toBeNull();
  });
});
