/// <reference types="bun-types/test" />
import { RbacService } from './rbac.service';
import { describe, expect, test, mock } from 'bun:test';

describe('RbacService.checkPermission', () => {
  test('maps allowed result', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    const result = await svc.checkPermission('acme', { resource: 'secrets', verb: 'get' });
    expect(result).toEqual({ allowed: true, denied: false, reason: undefined });
  });

  test('maps denied result', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: false, denied: true })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    const result = await svc.checkPermission('acme', { resource: 'secrets', verb: 'delete' });
    expect(result.allowed).toBe(false);
    expect(result.denied).toBe(true);
  });

  test('fails closed with reason on error', async () => {
    const fakeAccessReview = {
      create: mock(async () => {
        throw new Error('boom');
      }),
    };
    const svc = new RbacService(() => fakeAccessReview as never);
    const result = await svc.checkPermission('acme', { resource: 'secrets', verb: 'delete' });
    expect(result).toEqual({ allowed: false, denied: true, reason: 'boom' });
  });

  test('routes user-scoped checks to the user control-plane base', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', {
      resource: 'organizations',
      verb: 'list',
      scope: 'user',
    });
    const options = (
      fakeAccessReview.create.mock.calls[0] as unknown as [string, unknown, { baseURL: string }]
    )[2];
    expect(options.baseURL).toContain('/apis/iam.miloapis.com/v1alpha1/users/me/control-plane');
  });

  test('routes org-scoped checks (default) to the org control-plane base', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', { resource: 'secrets', verb: 'get' });
    const options = (
      fakeAccessReview.create.mock.calls[0] as unknown as [string, unknown, { baseURL: string }]
    )[2];
    expect(options.baseURL).toContain(
      '/apis/resourcemanager.miloapis.com/v1alpha1/organizations/acme/control-plane'
    );
  });

  test('routes project-scoped checks to the project control-plane base', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', {
      resource: 'dnszones',
      verb: 'list',
      scope: 'project',
      projectId: 'proj-1',
    });
    const options = (
      fakeAccessReview.create.mock.calls[0] as unknown as [string, unknown, { baseURL: string }]
    )[2];
    expect(options.baseURL).toContain(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj-1/control-plane'
    );
  });
});

describe('RbacService namespace resolution', () => {
  /** Pull the namespace from the SSAR payload (2nd positional arg to create). */
  function sentNamespace(create: { mock: { calls: unknown[][] } }): string {
    return (create.mock.calls[0] as [string, { namespace: string }, unknown])[1].namespace;
  }

  test('org-scoped check (default scope) targets the organization namespace', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', { resource: 'members', verb: 'list', scope: 'org' });
    expect(sentNamespace(fakeAccessReview.create)).toBe('organization-acme');
  });

  test('project-scoped check targets the default namespace', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', {
      resource: 'dnszones',
      verb: 'list',
      scope: 'project',
      projectId: 'proj-1',
    });
    expect(sentNamespace(fakeAccessReview.create)).toBe('default');
  });

  test('user-scoped check targets the empty (cluster-scoped) namespace', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', { resource: 'organizations', verb: 'list', scope: 'user' });
    expect(sentNamespace(fakeAccessReview.create)).toBe('');
  });

  test('explicit namespace overrides scope derivation', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    await svc.checkPermission('acme', {
      resource: 'members',
      verb: 'list',
      scope: 'org',
      namespace: 'custom-ns',
    });
    expect(sentNamespace(fakeAccessReview.create)).toBe('custom-ns');
  });
});

describe('RbacService.checkPermissions (bulk)', () => {
  test('returns per-check results with originating request', async () => {
    const fakeAccessReview = { create: mock(async () => ({ allowed: true, denied: false })) };
    const svc = new RbacService(() => fakeAccessReview as never);
    const results = await svc.checkPermissions('acme', [
      { resource: 'secrets', verb: 'get' },
      { resource: 'organizations', verb: 'list', scope: 'user' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      allowed: true,
      denied: false,
      reason: undefined,
      request: {
        resource: 'secrets',
        verb: 'get',
        group: '',
        // No scope → defaults to 'org' → resolved org namespace.
        namespace: 'organization-acme',
        name: undefined,
      },
    });
    expect(results[1].request.resource).toBe('organizations');
  });

  test('fails closed per-check without aborting the batch', async () => {
    let call = 0;
    const fakeAccessReview = {
      create: mock(async () => {
        call += 1;
        if (call === 1) throw new Error('boom');
        return { allowed: true, denied: false };
      }),
    };
    const svc = new RbacService(() => fakeAccessReview as never);
    const results = await svc.checkPermissions('acme', [
      { resource: 'secrets', verb: 'delete' },
      { resource: 'secrets', verb: 'get' },
    ]);
    expect(results[0]).toEqual({
      allowed: false,
      denied: true,
      reason: 'boom',
      request: {
        resource: 'secrets',
        verb: 'delete',
        group: '',
        // No scope → defaults to 'org' → resolved org namespace.
        namespace: 'organization-acme',
        name: undefined,
      },
    });
    expect(results[1].allowed).toBe(true);
  });
});
