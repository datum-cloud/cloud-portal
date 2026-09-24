import {
  buildSessionStatus,
  fullDisplayName,
  type SessionStatusDeps,
} from './session-status.builder';
import { describe, expect, test } from 'bun:test';

function deps(overrides: Partial<SessionStatusDeps> = {}): SessionStatusDeps {
  return {
    getUser: async () => ({
      givenName: 'Yahya',
      familyName: 'Fakhroji',
      email: 'yahya@example.com',
      avatarUrl: 'https://a/x.png',
    }),
    listOrganizations: async () => [
      { name: 'acme-1a2b', displayName: 'Acme' },
      { name: 'beta-9z8y', displayName: 'Beta' },
    ],
    hasProjects: async () => true,
    preferredOrg: null,
    appUrl: 'https://cloud.datum.net',
    timeoutMs: 2000,
    ...overrides,
  };
}

describe('fullDisplayName', () => {
  test('joins the given and family names without abbreviating', () => {
    expect(fullDisplayName({ givenName: 'Yahya', familyName: 'Fakhroji' })).toBe('Yahya Fakhroji');
    expect(fullDisplayName({ givenName: ' Yahya ', familyName: '' })).toBe('Yahya');
  });
  test('falls back to fullName, then to an empty string', () => {
    expect(fullDisplayName({ fullName: 'Ada Lovelace' })).toBe('Ada Lovelace');
    expect(fullDisplayName({})).toBe('');
  });
});

describe('buildSessionStatus', () => {
  test('returns the full payload for an active org', async () => {
    const status = await buildSessionStatus('u1', deps());
    expect(status).toEqual({
      signedIn: true,
      user: { displayName: 'Yahya Fakhroji', email: 'yahya@example.com', avatarUrl: 'https://a/x.png' },
      org: { name: 'acme-1a2b', displayName: 'Acme' },
      dashboardUrl: 'https://cloud.datum.net/org/acme-1a2b/projects',
      state: 'active',
    });
  });

  test('prefers the last-used org when it is a membership', async () => {
    const status = await buildSessionStatus('u1', deps({ preferredOrg: 'beta-9z8y' }));
    expect(status.signedIn && status.org?.name).toBe('beta-9z8y');
  });

  test('ignores a preferred org the user is not a member of', async () => {
    const status = await buildSessionStatus('u1', deps({ preferredOrg: 'ghost' }));
    expect(status.signedIn && status.org?.name).toBe('acme-1a2b');
  });

  test('points a new account at onboarding', async () => {
    const status = await buildSessionStatus('u1', deps({ hasProjects: async () => false }));
    expect(status).toMatchObject({
      state: 'new',
      dashboardUrl: 'https://cloud.datum.net/onboarding',
    });
  });

  test('with no orgs, omits org and points at onboarding as new', async () => {
    const status = await buildSessionStatus('u1', deps({ listOrganizations: async () => [] }));
    expect(status).toEqual({
      signedIn: true,
      user: { displayName: 'Yahya Fakhroji', email: 'yahya@example.com', avatarUrl: 'https://a/x.png' },
      dashboardUrl: 'https://cloud.datum.net/onboarding',
      state: 'new',
    });
  });

  test('a failing user lookup still answers signed in with an empty display name', async () => {
    const status = await buildSessionStatus(
      'u1',
      deps({
        getUser: async () => {
          throw new Error('milo down');
        },
      })
    );
    expect(status.signedIn).toBe(true);
    expect(status.signedIn && status.user).toEqual({ displayName: '' });
  });

  test('omits email when the user record has none', async () => {
    const status = await buildSessionStatus(
      'u1',
      deps({ getUser: async () => ({ givenName: 'Ada', familyName: 'Lovelace' }) })
    );
    expect(status.signedIn && status.user).toEqual({ displayName: 'Ada Lovelace' });
  });

  test('a failing project lookup drops state but keeps the org dashboard link', async () => {
    const status = await buildSessionStatus(
      'u1',
      deps({
        hasProjects: async () => {
          throw new Error('timeout');
        },
      })
    );
    expect(status.signedIn && status.state).toBeUndefined();
    expect(status.signedIn && status.dashboardUrl).toBe(
      'https://cloud.datum.net/org/acme-1a2b/projects'
    );
  });

  test('a slow org lookup is cut off at timeoutMs and treated as no orgs', async () => {
    const status = await buildSessionStatus(
      'u1',
      deps({
        timeoutMs: 20,
        listOrganizations: () => new Promise((resolve) => setTimeout(() => resolve([]), 500)),
      })
    );
    expect(status.signedIn && status.org).toBeUndefined();
  });

  test('bounds total wall time by timeoutMs across both settle phases', async () => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const start = performance.now();
    const status = await buildSessionStatus(
      'u1',
      deps({
        timeoutMs: 50,
        listOrganizations: async () => {
          await delay(40);
          return [{ name: 'acme-1a2b', displayName: 'Acme' }];
        },
        hasProjects: async () => {
          await delay(40);
          return true;
        },
      })
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(90);
    expect(status.signedIn && status.org?.name).toBe('acme-1a2b');
    expect(status.signedIn && status.state).toBeUndefined();
  });

  test('strips extra fields off an organization record before returning it', async () => {
    const status = await buildSessionStatus(
      'u1',
      deps({
        listOrganizations: async () => [
          { name: 'acme', displayName: 'Acme', role: 'owner', billingAccountId: 'b1' },
        ],
      })
    );
    expect(status.signedIn && status.org).toEqual({ name: 'acme', displayName: 'Acme' });
  });
});
