import { describe, expect, it } from 'vitest';
import { LoginSchema, RegisterSchema } from '@/lib/validations/auth';
import { safeNextPath } from '@/lib/auth/redirect';

describe('authentication input', () => {
  it('requires matching registration passwords', () => {
    const result = RegisterSchema.safeParse({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'correct horse',
      confirmPassword: 'wrong horse',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed login email', () => {
    expect(LoginSchema.safeParse({ email: 'invalid', password: 'password' }).success).toBe(false);
  });

  it('only returns local application paths after login', () => {
    expect(safeNextPath('/habits?month=2026-10')).toBe('/habits?month=2026-10');
    expect(safeNextPath('//evil.example')).toBe('/today');
    expect(safeNextPath('/\\evil.example')).toBe('/today');
    expect(safeNextPath('/login')).toBe('/today');
  });
});
