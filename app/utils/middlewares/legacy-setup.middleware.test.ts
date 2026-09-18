import { orgLegacySetupMiddleware, projectLegacySetupMiddleware } from './legacy-setup.middleware';
import type { MiddlewareContext } from './middleware';
import { withRequestContext } from '@/modules/axios/request-context';
import { getProjectForRequest } from '@/resources/projects/project-request-cache.server';
import { paths } from '@/utils/config/paths.config';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

// Mutable behavior for the mocked dependencies, set per-test.
let bypass = false;
let orgComplete = false;
let isOwner = true;
let projectOrg: string | null = 'acme';

const bypassEnabled = mock(() => bypass);
const isOrgSetupComplete = mock(async () => orgComplete);
const isUserOrgOwner = mock(async () => isOwner);
const projectGet = mock(async (name: string) => ({ name, organizationId: projectOrg }));

mock.module('@/features/onboarding/onboarding-dev-bypass', () => ({
  isOnboardingDevBypassEnabled: bypassEnabled,
}));
mock.module('@/features/onboarding/legacy-setup/org-setup-status.server', () => ({
  isOrgSetupComplete,
}));
mock.module('@/resources/members/member-owner', () => ({
  isUserOrgOwner,
}));
// The middleware now reaches the service through `getProjectForRequest`, which
// imports `./project.service` directly rather than the `@/resources/projects`
// barrel — so the stub has to sit on the service module. The per-request cache
// itself runs for real; it is part of what these tests cover.
mock.module('@/resources/projects/project.service', () => ({
  createProjectService: () => ({ get: projectGet }),
}));

const NEXT = new Response('next', { status: 200 });

function ctx(url: string): MiddlewareContext {
  return { request: new Request(url), context: {} as never };
}

const next = mock(async () => NEXT);

beforeEach(() => {
  bypass = false;
  orgComplete = false;
  isOwner = true;
  projectOrg = 'acme';
  bypassEnabled.mockClear();
  isOrgSetupComplete.mockClear();
  isUserOrgOwner.mockClear();
  projectGet.mockClear();
  projectGet.mockImplementation(async (name: string) => ({ name, organizationId: projectOrg }));
  next.mockClear();
});

describe('legacy-setup dev bypass (ONBOARDING_DEV_BYPASS)', () => {
  it('org gate short-circuits to next() when the dev bypass is enabled, skipping setup checks', async () => {
    bypass = true;

    const res = await orgLegacySetupMiddleware(ctx('http://localhost/org/acme/home'), next);

    expect(res).toBe(NEXT);
    expect(next).toHaveBeenCalledTimes(1);
    // The billing setup check is never consulted on the bypass path.
    expect(isOrgSetupComplete).not.toHaveBeenCalled();
  });

  it('project gate short-circuits to next() when the dev bypass is enabled, skipping the project fetch', async () => {
    bypass = true;

    const res = await projectLegacySetupMiddleware(ctx('http://localhost/project/p1/home'), next);

    expect(res).toBe(NEXT);
    expect(next).toHaveBeenCalledTimes(1);
    expect(projectGet).not.toHaveBeenCalled();
    expect(isOrgSetupComplete).not.toHaveBeenCalled();
  });
});

describe('legacy-setup gate unchanged when the dev bypass is off (prod behavior)', () => {
  it('org gate still redirects an incomplete org to billing setup', async () => {
    bypass = false;
    orgComplete = false;
    isOwner = true;

    const res = await orgLegacySetupMiddleware(ctx('http://localhost/org/acme/home'), next);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain(paths.onboarding.billing);
    expect(isOrgSetupComplete).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('org gate still allows a fully set-up org through', async () => {
    bypass = false;
    orgComplete = true;

    const res = await orgLegacySetupMiddleware(ctx('http://localhost/org/acme/home'), next);

    expect(res).toBe(NEXT);
    expect(isOrgSetupComplete).toHaveBeenCalledTimes(1);
  });

  it('project gate still redirects when the owning org is incomplete', async () => {
    bypass = false;
    orgComplete = false;
    isOwner = true;
    projectOrg = 'acme';

    const res = await projectLegacySetupMiddleware(ctx('http://localhost/project/p1/home'), next);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain(paths.onboarding.billing);
    expect(projectGet).toHaveBeenCalledTimes(1);
  });

  it('project gate caches the project so the layout loader reuses it', async () => {
    // The middleware fetches the project only to resolve its owning org; the
    // project detail layout loader then wants the identical record. Without the
    // request-scoped cache that is two sequential round trips for one row.
    bypass = false;
    orgComplete = true;
    projectOrg = 'acme';

    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const res = await projectLegacySetupMiddleware(ctx('http://localhost/project/p1/home'), next);
      expect(res).toBe(NEXT);
      expect(projectGet).toHaveBeenCalledTimes(1);

      // What the layout loader's `fetch` now does.
      const project = await getProjectForRequest('p1');
      expect(project.name).toBe('p1');
      expect(projectGet).toHaveBeenCalledTimes(1);
    });
  });

  it('a different project id is never served from the cache', async () => {
    bypass = false;
    orgComplete = true;

    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      await projectLegacySetupMiddleware(ctx('http://localhost/project/p1/home'), next);
      expect(projectGet).toHaveBeenCalledTimes(1);

      const other = await getProjectForRequest('p2');
      expect(other.name).toBe('p2');
      expect(projectGet).toHaveBeenCalledTimes(2);
    });
  });

  it('a failed middleware fetch leaves the cache empty so the loader still fetches', async () => {
    // The middleware fails open by design — the loader owns not-found and
    // access errors — so a failure must not poison or short-circuit the loader's
    // own fetch.
    bypass = false;
    orgComplete = true;
    let firstCall = true;
    projectGet.mockImplementation(async (name: string) => {
      if (firstCall) {
        firstCall = false;
        throw new Error('upstream down');
      }
      return { name, organizationId: 'acme' };
    });

    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const res = await projectLegacySetupMiddleware(ctx('http://localhost/project/p1/home'), next);
      expect(res).toBe(NEXT);

      const project = await getProjectForRequest('p1');
      expect(project.name).toBe('p1');
      expect(projectGet).toHaveBeenCalledTimes(2);
    });
  });

  it('org gate ignores non-org paths (no setup check, passes through)', async () => {
    bypass = false;

    const res = await orgLegacySetupMiddleware(ctx('http://localhost/account/settings'), next);

    expect(res).toBe(NEXT);
    expect(isOrgSetupComplete).not.toHaveBeenCalled();
  });

  it('org gate still exempts setup-required on single-fetch .data URLs', async () => {
    bypass = false;
    orgComplete = false;

    const res = await orgLegacySetupMiddleware(
      ctx('http://localhost/org/acme/setup-required.data'),
      next
    );

    expect(res).toBe(NEXT);
    expect(isOrgSetupComplete).not.toHaveBeenCalled();
  });

  it('org gate still redirects incomplete orgs on single-fetch .data URLs', async () => {
    bypass = false;
    orgComplete = false;
    isOwner = true;

    const res = await orgLegacySetupMiddleware(
      ctx('http://localhost/org/acme/projects.data'),
      next
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain(paths.onboarding.billing);
  });
});
