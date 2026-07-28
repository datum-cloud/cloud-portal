import { omitBlankEnv } from './omit-blank-env';
import { describe, expect, it } from 'bun:test';
import { z } from 'zod';

describe('omitBlankEnv', () => {
  it('drops empty-string values', () => {
    // Arrange — how GitHub Actions exports an unset secret
    const source = { AUTH_OIDC_ISSUER: '', APP_URL: 'http://localhost:3000' };

    // Act
    const result = omitBlankEnv(source);

    // Assert
    expect(result).toEqual({ APP_URL: 'http://localhost:3000' });
    expect('AUTH_OIDC_ISSUER' in result).toBe(false);
  });

  it('drops whitespace-only values', () => {
    expect(omitBlankEnv({ A: '   ', B: '\t\n' })).toEqual({});
  });

  it('drops undefined values', () => {
    expect(omitBlankEnv({ A: undefined, B: 'kept' })).toEqual({ B: 'kept' });
  });

  it('preserves values that only look falsy', () => {
    // A naive truthiness filter would discard these.
    expect(omitBlankEnv({ DEBUG: 'false', RETRIES: '0', PREFIX: ' x ' })).toEqual({
      DEBUG: 'false',
      RETRIES: '0',
      PREFIX: ' x ',
    });
  });

  it('does not mutate the source', () => {
    const source = { A: '', B: 'kept' };

    omitBlankEnv(source);

    expect(source).toEqual({ A: '', B: 'kept' });
  });

  it('lets a Zod default fire for a blank value', () => {
    // The actual regression: `.default()` only applies to `undefined`, so a
    // blank value fails `z.url()` and exits(1) instead of defaulting.
    const schema = z.object({ AUTH_OIDC_ISSUER: z.url().default('http://localhost:8080') });

    expect(schema.safeParse({ AUTH_OIDC_ISSUER: '' }).success).toBe(false);
    expect(schema.safeParse(omitBlankEnv({ AUTH_OIDC_ISSUER: '' }))).toMatchObject({
      success: true,
      data: { AUTH_OIDC_ISSUER: 'http://localhost:8080' },
    });
  });

  it('lets a Zod optional stay absent for a blank value', () => {
    // Mirrors AUTH_OIDC_POST_LOGOUT_REDIRECT_URI= in .env.example
    const schema = z.object({ POST_LOGOUT: z.url().optional() });

    expect(schema.safeParse({ POST_LOGOUT: '' }).success).toBe(false);
    expect(schema.safeParse(omitBlankEnv({ POST_LOGOUT: '' })).success).toBe(true);
  });
});
