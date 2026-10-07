import { describe, expect, it } from 'vitest';
import { parseServerEnv } from '@/lib/env';

const validEnv = {
  DATABASE_URL: 'postgresql://habitflow:habitflow@localhost:5433/habitflow',
  BETTER_AUTH_SECRET: 'a-long-development-secret-with-32-chars',
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('server environment validation', () => {
  it('accepts the documented local development variables', () => {
    expect(parseServerEnv(validEnv).DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it('reports variable names without leaking values', () => {
    expect(() => parseServerEnv({ ...validEnv, DATABASE_URL: 'invalid-secret-value' })).toThrow(
      'Invalid server environment variables: DATABASE_URL',
    );
  });

  it('requires HTTPS and TLS on Vercel production', () => {
    expect(() => parseServerEnv({ ...validEnv, VERCEL_ENV: 'production' })).toThrow('Invalid production environment variables');
    expect(parseServerEnv({
      ...validEnv,
      VERCEL_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@ep-example-pooler.neon.tech/db?sslmode=require',
      BETTER_AUTH_URL: 'https://habitflow.example.com',
      NEXT_PUBLIC_APP_URL: 'https://habitflow.example.com',
    }).BETTER_AUTH_URL).toBe('https://habitflow.example.com');
  });
});
