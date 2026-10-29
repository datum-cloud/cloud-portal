import { buildSessionStatus, type SessionStatusDeps } from './session-status.builder';
import { describe, expect, test } from 'bun:test';

const APP_URL = 'https://cloud.example.com';

function deps(overrides: Partial<SessionStatusDeps> = {}): SessionStatusDeps {
  return {
    getUser: async () => ({ givenName: 'Ada', familyName: 'Lovelace', email: 'ada@example.com' }),
    listOrganizations: async () => [{ name: 'personal-org-1', displayName: 'Ada' }],
    hasProjects: async () => true,
    getProject: async (name) => ({
      name,
      displayName: 'My API',
      organizationId: 'personal-org-1',
    }),
    preferredOrg: null,
    preferredProject: null,
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

describe('buildSessionStatus project', () => {
  test('returns the project cookie when it belongs to the selected org', async () => {
    let hasProjectsCalls = 0;
    const status = await buildSessionStatus(
      'sub-1',
      deps({
        preferredProject: 'my-api',
        hasProjects: async () => {
          hasProjectsCalls += 1;
          return true;
        },
      })
    );

    expect(status).toMatchObject({
      org: { name: 'personal-org-1', hasProjects: true },
      project: { name: 'my-api', displayName: 'My API' },
      dashboardUrl: `${APP_URL}/project/my-api/home`,
      state: 'active',
    });
    // A project in the selected org already proves the org has one.
    expect(hasProjectsCalls).toBe(0);
  });

  test('omits a project cookie that points at another org', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({
        preferredProject: 'their-api',
        getProject: async (name) => ({
          name,
          displayName: 'Their API',
          organizationId: 'someone-elses-org',
        }),
      })
    );

    expect(status).not.toHaveProperty('project');
    expect(status).toMatchObject({
      dashboardUrl: `${APP_URL}/org/personal-org-1/projects`,
      state: 'active',
    });
  });

  test('skips the project lookup when there is no project cookie', async () => {
    let getProjectCalls = 0;
    const status = await buildSessionStatus(
      'sub-1',
      deps({
        getProject: async (name) => {
          getProjectCalls += 1;
          return { name, displayName: 'My API', organizationId: 'personal-org-1' };
        },
      })
    );

    expect(status).not.toHaveProperty('project');
    expect(getProjectCalls).toBe(0);
  });

  test('omits the project when its lookup misses the deadline', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({
        preferredProject: 'my-api',
        getProject: () => new Promise(() => {}),
      })
    );

    expect(status).not.toHaveProperty('project');
    expect(status).toMatchObject({ signedIn: true, state: 'active' });
  });

  test('omits the project when access to it was revoked', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({
        preferredProject: 'my-api',
        getProject: async () => Promise.reject(new Error('403 forbidden')),
      })
    );

    expect(status).not.toHaveProperty('project');
    expect(status).toMatchObject({ dashboardUrl: `${APP_URL}/org/personal-org-1/projects` });
  });

  test('omits a project that is being deleted', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({
        preferredProject: 'my-api',
        getProject: async (name) => ({
          name,
          displayName: 'My API',
          organizationId: 'personal-org-1',
          deletionTimestamp: new Date('2026-10-29T00:00:00Z'),
        }),
      })
    );

    expect(status).not.toHaveProperty('project');
  });
});

describe('buildSessionStatus org.selected', () => {
  const twoOrgs = async () => [
    { name: 'personal-org-1', displayName: 'Ada' },
    { name: 'acme-corp', displayName: 'Acme' },
  ];

  test('marks the org from the _org cookie as selected', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({ listOrganizations: twoOrgs, preferredOrg: 'acme-corp' })
    );

    expect(status).toMatchObject({ org: { name: 'acme-corp', selected: true } });
  });

  test('marks the only membership as selected without a cookie', async () => {
    const status = await buildSessionStatus('sub-1', deps());

    expect(status).toMatchObject({ org: { name: 'personal-org-1', selected: true } });
  });

  test('does not mark a first-membership fallback as selected', async () => {
    const status = await buildSessionStatus('sub-1', deps({ listOrganizations: twoOrgs }));

    expect(status).toMatchObject({ org: { name: 'personal-org-1', selected: false } });
  });

  test('does not mark the fallback as selected when the cookie names an org the user left', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({ listOrganizations: twoOrgs, preferredOrg: 'former-org' })
    );

    expect(status).toMatchObject({ org: { name: 'personal-org-1', selected: false } });
  });

  test('marks the org as selected when a valid project confirms it', async () => {
    const status = await buildSessionStatus(
      'sub-1',
      deps({ listOrganizations: twoOrgs, preferredProject: 'my-api' })
    );

    expect(status).toMatchObject({
      org: { name: 'personal-org-1', selected: true },
      project: { name: 'my-api' },
    });
  });
});
