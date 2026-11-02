import {
  resolveReturnTo,
  type ResolveReturnToInput,
  type ReturnToAccess,
} from './post-login-access';
import { describe, expect, test, vi } from 'vitest';

const FALLBACK = '/account/organizations';
const WEBSITE = 'https://www.datum.net';
const SUB = 'user-1';

function access(denied: { orgs?: string[]; projects?: string[] } = {}) {
  const deny = (kind: string, id: string) => {
    throw new Error(`${kind} ${id} not visible`);
  };
  const impl = {
    getOrganization: vi.fn(async (orgId: string) =>
      denied.orgs?.includes(orgId) ? deny('org', orgId) : { name: orgId }
    ),
    getProject: vi.fn(async (projectId: string) =>
      denied.projects?.includes(projectId) ? deny('project', projectId) : { name: projectId }
    ),
  } satisfies ReturnToAccess;
  return impl;
}

function input(overrides: Partial<ResolveReturnToInput>): ResolveReturnToInput {
  return {
    intentPath: undefined,
    intentSub: undefined,
    sub: SUB,
    allowedOrigins: [WEBSITE],
    fallback: FALLBACK,
    access: access(),
    ...overrides,
  };
}

describe('resolveReturnTo', () => {
  test('returns the fallback when there is no intent', async () => {
    expect(await resolveReturnTo(input({ intentPath: undefined }))).toBe(FALLBACK);
    expect(await resolveReturnTo(input({ intentPath: null }))).toBe(FALLBACK);
    expect(await resolveReturnTo(input({ intentPath: '' }))).toBe(FALLBACK);
  });

  test('keeps an allow-listed website URL without checking access', async () => {
    const reads = access();
    const target = `${WEBSITE}/pricing?plan=pro`;
    expect(await resolveReturnTo(input({ intentPath: target, access: reads }))).toBe(target);
    expect(reads.getOrganization).not.toHaveBeenCalled();
    expect(reads.getProject).not.toHaveBeenCalled();
  });

  test('falls back for an origin that is not allow-listed', async () => {
    expect(await resolveReturnTo(input({ intentPath: 'https://evil.example/org/acme' }))).toBe(
      FALLBACK
    );
  });

  test('falls back for credentials smuggled into an allow-listed origin', async () => {
    expect(
      await resolveReturnTo(input({ intentPath: 'https://user:pw@www.datum.net/pricing' }))
    ).toBe(FALLBACK);
  });

  test.each([
    ['protocol-relative', '//evil.example/org/acme'],
    ['backslash protocol-relative', '/\\evil.example/org/acme'],
    ['javascript: scheme', 'javascript:alert(1)'],
    ['data: scheme', 'data:text/html,<script>alert(1)</script>'],
    ['auth route', '/auth/callback'],
    ['login route', '/login'],
  ])('never restores a %s target', async (_label, intentPath) => {
    expect(await resolveReturnTo(input({ intentPath }))).toBe(FALLBACK);
  });

  test('restores an account page for the same user without a lookup', async () => {
    const reads = access();
    expect(
      await resolveReturnTo(
        input({ intentPath: '/account/preferences', intentSub: SUB, access: reads })
      )
    ).toBe('/account/preferences');
    expect(reads.getOrganization).not.toHaveBeenCalled();
  });

  test('restores an invitation page only with an invitation id', async () => {
    expect(await resolveReturnTo(input({ intentPath: '/invitation/abc' }))).toBe('/invitation/abc');
    expect(await resolveReturnTo(input({ intentPath: '/invitation' }))).toBe(FALLBACK);
  });

  test('restores an org page when the new token can read the org', async () => {
    const reads = access();
    expect(await resolveReturnTo(input({ intentPath: '/org/acme/projects', access: reads }))).toBe(
      '/org/acme/projects'
    );
    expect(reads.getOrganization).toHaveBeenCalledWith('acme');
  });

  test('restores a project page when the new token can read the project', async () => {
    const reads = access();
    expect(
      await resolveReturnTo(input({ intentPath: '/project/web-1/domains?tab=a', access: reads }))
    ).toBe('/project/web-1/domains?tab=a');
    expect(reads.getProject).toHaveBeenCalledWith('web-1');
  });

  test('falls back when the org is denied', async () => {
    const reads = access({ orgs: ['acme'] });
    expect(await resolveReturnTo(input({ intentPath: '/org/acme', access: reads }))).toBe(FALLBACK);
  });

  test('falls back when the project is denied', async () => {
    const reads = access({ projects: ['web-1'] });
    expect(await resolveReturnTo(input({ intentPath: '/project/web-1', access: reads }))).toBe(
      FALLBACK
    );
  });

  test.each([
    ['upper case', '/org/ACME'],
    ['underscore', '/project/web_1'],
    ['leading hyphen', '/org/-acme'],
    ['trailing hyphen', '/project/web-'],
  ])('falls back without a lookup for an invalid id (%s)', async (_label, intentPath) => {
    const reads = access();
    expect(await resolveReturnTo(input({ intentPath, access: reads }))).toBe(FALLBACK);
    expect(reads.getOrganization).not.toHaveBeenCalled();
    expect(reads.getProject).not.toHaveBeenCalled();
  });

  test('falls back for a bare /org or /project path', async () => {
    expect(await resolveReturnTo(input({ intentPath: '/org' }))).toBe(FALLBACK);
    expect(await resolveReturnTo(input({ intentPath: '/project/' }))).toBe(FALLBACK);
  });

  test('falls back for any other portal page', async () => {
    expect(await resolveReturnTo(input({ intentPath: '/settings' }))).toBe(FALLBACK);
  });

  test('falls back when the intent was saved for another user', async () => {
    const reads = access();
    expect(
      await resolveReturnTo(
        input({ intentPath: '/org/acme', intentSub: 'someone-else', access: reads })
      )
    ).toBe(FALLBACK);
    expect(reads.getOrganization).not.toHaveBeenCalled();
  });

  test('drops a website URL saved for another user', async () => {
    expect(
      await resolveReturnTo(input({ intentPath: `${WEBSITE}/pricing`, intentSub: 'someone-else' }))
    ).toBe(FALLBACK);
  });

  test('treats an intent without a saved user as the same user', async () => {
    expect(await resolveReturnTo(input({ intentPath: '/org/acme', intentSub: null }))).toBe(
      '/org/acme'
    );
  });
});
