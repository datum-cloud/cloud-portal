import {
  buildPasskeysHref,
  buildSecurityReturnTo,
  buildSignInMethodRows,
  buildSsoHref,
  countActivePasskeys,
} from './sign-in-methods';
import type { Passkey, UserIdentity } from '@/resources/users';
import { describe, expect, it } from 'bun:test';

const ORIGIN = 'https://auth.example.test';
const RETURN_TO = 'https://cloud.example.test/account/security';

function identity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    name: 'identity-1',
    username: 'user@example.test',
    providerName: 'Google',
    providerID: 'idp-1',
    userUID: 'uid-1',
    ...overrides,
  };
}

function passkey(overrides: Partial<Passkey> = {}): Passkey {
  return {
    id: 'passkey-1',
    displayName: 'MacBook Pro',
    state: 'Active',
    userUID: 'uid-1',
    ...overrides,
  };
}

function build(identities: UserIdentity[], passkeys: Passkey[] | null) {
  return buildSignInMethodRows({
    identities,
    passkeys,
    authUiOrigin: ORIGIN,
    returnTo: RETURN_TO,
  });
}

describe('countActivePasskeys', () => {
  it('counts only Active passkeys', () => {
    const result = countActivePasskeys([
      passkey({ id: 'a', state: 'Active' }),
      passkey({ id: 'b', state: 'Inactive' }),
    ]);

    expect(result).toBe(1);
  });

  it('returns 0 when every passkey is Inactive', () => {
    const result = countActivePasskeys([passkey({ state: 'Inactive' })]);

    expect(result).toBe(0);
  });
});

describe('href builders', () => {
  it('builds the sso href with a single /id prefix', () => {
    expect(buildSsoHref(ORIGIN)).toBe('https://auth.example.test/id/sso');
  });

  it('builds the passkeys href with an encoded returnTo', () => {
    expect(buildPasskeysHref(ORIGIN, RETURN_TO)).toBe(
      'https://auth.example.test/id/passkeys?returnTo=https%3A%2F%2Fcloud.example.test%2Faccount%2Fsecurity'
    );
  });

  it('builds the security returnTo from the app url', () => {
    expect(buildSecurityReturnTo('https://cloud.example.test')).toBe(
      'https://cloud.example.test/account/security'
    );
  });
});

describe('buildSignInMethodRows', () => {
  it('renders one row per linked identity, then passkeys, then connect rows', () => {
    const rows = build([identity()], []);

    expect(rows.map((row) => row.kind)).toEqual(['identity', 'passkeys', 'connect']);
    expect(rows.map((row) => row.providerKey)).toEqual(['google', 'passkeys', 'github']);
  });

  it('maps an identity row to its label, username and sso href', () => {
    const [row] = build([identity()], []);

    expect(row.label).toBe('Google');
    expect(row.sublabel).toBe('user@example.test');
    expect(row.actionLabel).toBe('Manage');
    expect(row.href).toBe('https://auth.example.test/id/sso');
    expect(row.key).toBe('identity-1');
  });

  it('falls back to the Email label when providerName is absent', () => {
    const [row] = build([identity({ providerName: undefined })], []);

    expect(row.providerKey).toBe('email');
    expect(row.label).toBe('Email');
  });

  it('falls back to the raw providerName when it is unknown', () => {
    const [row] = build([identity({ providerName: 'GitLab' })], []);

    expect(row.providerKey).toBe('gitlab');
    expect(row.label).toBe('GitLab');
  });

  it('shows an Add action and empty copy when there are no passkeys', () => {
    const row = build([], []).find((candidate) => candidate.kind === 'passkeys');

    expect(row?.sublabel).toBe('No passkeys yet');
    expect(row?.actionLabel).toBe('Add');
  });

  it('treats an inactive-only passkey list as zero', () => {
    const row = build([], [passkey({ state: 'Inactive' })]).find(
      (candidate) => candidate.kind === 'passkeys'
    );

    expect(row?.sublabel).toBe('No passkeys yet');
    expect(row?.actionLabel).toBe('Add');
  });

  it('uses singular copy for one active passkey', () => {
    const row = build([], [passkey()]).find((candidate) => candidate.kind === 'passkeys');

    expect(row?.sublabel).toBe('1 passkey registered');
    expect(row?.actionLabel).toBe('Manage');
  });

  it('uses plural copy for several active passkeys', () => {
    const row = build([], [passkey({ id: 'a' }), passkey({ id: 'b' })]).find(
      (candidate) => candidate.kind === 'passkeys'
    );

    expect(row?.sublabel).toBe('2 passkeys registered');
  });

  it('omits a connect row for a provider that is already linked', () => {
    const rows = build(
      [
        identity({ providerName: 'Google' }),
        identity({ name: 'identity-2', providerName: 'GitHub' }),
      ],
      []
    );

    expect(rows.filter((row) => row.kind === 'connect')).toHaveLength(0);
  });

  it('reports an unknown count rather than zero when the passkey query failed', () => {
    const rows = build([identity()], null);
    const row = rows.find((candidate) => candidate.kind === 'passkeys');

    // Regression: passing [] on failure rendered "No passkeys yet" — a
    // confident false statement. null must read as unknown, and must never
    // offer "Add", which also implies zero.
    expect(row?.sublabel).toBe("Couldn't load your passkeys");
    expect(row?.actionLabel).toBe('Manage');
  });

  it('still renders identity and connect rows when the passkey query failed', () => {
    const rows = build([identity()], null);

    expect(rows.map((r) => r.kind)).toEqual(['identity', 'passkeys', 'connect']);
    expect(rows[0].sublabel).toBe('user@example.test');
  });

  it('describes a connect row with its provider label and sso href', () => {
    const row = build([], []).find((candidate) => candidate.providerKey === 'github');

    expect(row?.kind).toBe('connect');
    expect(row?.sublabel).toBe('Connect your GitHub account');
    expect(row?.actionLabel).toBe('Connect');
    expect(row?.href).toBe('https://auth.example.test/id/sso');
    expect(row?.key).toBe('connect-github');
  });
});
