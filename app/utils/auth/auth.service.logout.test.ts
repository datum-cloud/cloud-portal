import { buildEndSessionUrl } from '@/utils/auth/auth.service';
import { describe, test, expect } from 'bun:test';

const ISSUER = 'https://auth.localtest.me:30000';

describe('buildEndSessionUrl', () => {
  test('returns null when no idToken (caller falls back to local destroy)', () => {
    expect(
      buildEndSessionUrl(undefined, {
        issuer: ISSUER,
        clientId: 'cid',
        postLogoutRedirectUri: undefined,
      })
    ).toBeNull();
  });

  test('idToken only, no post-logout configured → id_token_hint only (no client_id, no uri)', () => {
    const u = new URL(
      buildEndSessionUrl('idtok', {
        issuer: ISSUER,
        clientId: 'cid',
        postLogoutRedirectUri: undefined,
      })!
    );
    expect(u.origin + u.pathname).toBe(`${ISSUER}/oidc/v1/end_session`);
    expect(u.searchParams.get('id_token_hint')).toBe('idtok');
    expect(u.searchParams.has('client_id')).toBe(false);
    expect(u.searchParams.has('post_logout_redirect_uri')).toBe(false);
  });

  test('post-logout configured → includes client_id + post_logout_redirect_uri', () => {
    const u = new URL(
      buildEndSessionUrl('idtok', {
        issuer: ISSUER,
        clientId: 'cid',
        postLogoutRedirectUri: 'http://localhost:3001/login',
      })!
    );
    expect(u.searchParams.get('id_token_hint')).toBe('idtok');
    expect(u.searchParams.get('client_id')).toBe('cid');
    expect(u.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3001/login');
  });
});
