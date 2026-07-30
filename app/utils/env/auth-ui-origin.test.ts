import { AUTH_UI_PATH_PREFIX, resolveAuthUiOrigin } from './auth-ui-origin';
import { describe, expect, it } from 'bun:test';

describe('resolveAuthUiOrigin', () => {
  it('prefers an explicit AUTH_UI_ORIGIN over the issuer', () => {
    // Arrange
    const explicit = 'http://localhost:3001';
    const issuer = 'https://auth.staging.env.datum.net';

    // Act
    const origin = resolveAuthUiOrigin(explicit, issuer);

    // Assert
    expect(origin).toBe('http://localhost:3001');
  });

  it('strips trailing slashes from an explicit origin', () => {
    expect(resolveAuthUiOrigin('http://localhost:3001///', undefined)).toBe(
      'http://localhost:3001'
    );
  });

  it('drops any path on an explicit origin, not just trailing slashes', () => {
    // Regression: the override branch only trimmed slashes, so an operator who
    // set AUTH_UI_ORIGIN=<host>/id — the exact mistake .env.example warns
    // against — got /id/id/passkeys. The derived branch already normalised.
    expect(resolveAuthUiOrigin('http://localhost:3001/id', undefined)).toBe(
      'http://localhost:3001'
    );
  });

  it('falls back to slash-trimming when an explicit origin is unparseable', () => {
    expect(resolveAuthUiOrigin('not a url//', undefined)).toBe('not a url');
  });

  it('derives the issuer origin when AUTH_UI_ORIGIN is unset', () => {
    // Arrange
    const issuer = 'https://auth.staging.env.datum.net';

    // Act
    const origin = resolveAuthUiOrigin(undefined, issuer);

    // Assert
    expect(origin).toBe('https://auth.staging.env.datum.net');
  });

  it('drops any path on the issuer when deriving, keeping only the origin', () => {
    expect(resolveAuthUiOrigin(undefined, 'https://auth.example.com/oauth/v2')).toBe(
      'https://auth.example.com'
    );
  });

  it('builds a single /id prefix when the derived origin is used', () => {
    // Regression: an AUTH_UI_ORIGIN of "<host>/id" plus the appended prefix
    // produced "<host>/id/id/passkeys".
    const origin = resolveAuthUiOrigin(undefined, 'https://auth.staging.env.datum.net');

    expect(`${origin}${AUTH_UI_PATH_PREFIX}/passkeys`).toBe(
      'https://auth.staging.env.datum.net/id/passkeys'
    );
  });

  it('returns an empty string when neither value is available', () => {
    expect(resolveAuthUiOrigin(undefined, undefined)).toBe('');
    expect(resolveAuthUiOrigin('', '')).toBe('');
  });

  it('returns an empty string when the issuer is not a parseable URL', () => {
    expect(resolveAuthUiOrigin(undefined, 'not-a-url')).toBe('');
  });
});
