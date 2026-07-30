import { orgLegacySetupMiddleware, projectLegacySetupMiddleware } from './legacy-setup.middleware';
import type { MiddlewareContext } from './middleware';
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
const projectGet = mock(async () => ({ organizationId: projectOrg }));

mock.module('@/features/onboarding/onboarding-dev-bypass', () => ({
  isOnboardingDevBypassEnabled: bypassEnabled,
}));
mock.module('@/features/onboarding/legacy-setup/org-setup-status.server', () => ({
  isOrgSetupComplete,
}));
mock.module('@/resources/members/member-owner', () => ({
  isUserOrgOwner,
}));
mock.module('@/resources/projects', () => ({
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

  it('org gate ignores non-org paths (no setup check, passes through)', async () => {
    bypass = false;

    const res = await orgLegacySetupMiddleware(ctx('http://localhost/account/settings'), next);

    expect(res).toBe(NEXT);
    expect(isOrgSetupComplete).not.toHaveBeenCalled();
  });
});
