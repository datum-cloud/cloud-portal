import { buildSessionStatus, type SessionStatusDeps } from './session-status.builder';
import { describe, expect, test } from 'vitest';

const APP_URL = 'https://cloud.example.com';

function deps(overrides: Partial<SessionStatusDeps> = {}): SessionStatusDeps {
  return {
    getUser: async () => ({ givenName: 'Ada', familyName: 'Lovelace', email: 'ada@example.com' }),
    listOrganizations: async () => [{ name: 'personal-org-1', displayName: 'Ada' }],
    hasProjects: async () => true,
    preferredOrg: null,
    appUrl: APP_URL,
    timeoutMs: 50,
    ...overrides,
  };
}

describe('buildSessionStatus dashboardUrl', () => {
  test('sends a user without an org to the organizations list', async () => {
    const status = await buildSessionStatus('sub-1', deps({ listOrganizations: async () => [] }));

    expect(status).toMatchObject({
      dashboardUrl: `${APP_URL}/account/organizations`,
      state: 'new',
    });
  });

  test('sends a user whose org lookup failed to the organizations list', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({ listOrganizations: async () => Promise.reject(new Error('milo down')) })
    );

    expect(status).toMatchObject({ dashboardUrl: `${APP_URL}/account/organizations` });
  });

  test('opens the create-project dialog for an org with no projects', async () => {
    const status = await buildSessionStatus('sub-1', deps({ hasProjects: async () => false }));

    expect(status).toMatchObject({
      org: { name: 'personal-org-1', hasProjects: false },
      dashboardUrl: `${APP_URL}/org/personal-org-1/projects?action=create`,
      state: 'new',
    });
  });

  test('links an org with projects to its projects list', async () => {
    const status = await buildSessionStatus('sub-1', deps());

    expect(status).toMatchObject({
      dashboardUrl: `${APP_URL}/org/personal-org-1/projects`,
      state: 'active',
    });
  });

  test('links to the projects list without the dialog when the project lookup fails', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({ hasProjects: async () => Promise.reject(new Error('milo down')) })
    );

    expect(status).toMatchObject({ dashboardUrl: `${APP_URL}/org/personal-org-1/projects` });
    expect(status).not.toHaveProperty('state');
  });
});
