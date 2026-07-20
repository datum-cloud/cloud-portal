/// <reference types="bun-types/test" />
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { LoaderFunctionArgs } from 'react-router';

// Module-level mock for gateRouteAccess. We hold a mutable ref the tests can
// reconfigure per case. ESM namespace objects are frozen at runtime, so we
// cannot reassign `gateModule.gateRouteAccess` directly — `mock.module` is the
// supported Bun primitive for this.
const gateRouteAccessSpy = mock(async () => true);

mock.module('./server/check-permission', () => ({
  gateRouteAccess: (...args: unknown[]) => gateRouteAccessSpy(...(args as [])),
}));

// Stub `@/utils/cookies` so `redirectWithToast` does not touch the real
// cookie/env stack. The descriptor's `toast` may lack `description` (which the
// production ToastSchema requires), so the stub bypasses Zod parsing and
// returns a plain redirect Response. Tests assert on `status` + `Location`
// only, which matches the real `redirectWithToast` contract.
mock.module('@/utils/cookies', () => ({
  redirectWithToast: async (url: string) =>
    new Response(null, { status: 302, headers: { Location: url } }),
}));

// Import AFTER the mock is registered so the SUT picks up the mocked module.
// The DSL is now split: `define-resource-route` is client-safe (Page/meta/handle)
// and `run-resource-loader` is the server-only loader runtime. Tests target the
// server-only runtime directly since loader behavior is what we want to assert.
const { runListLoader, runDetailLoader } = await import('./run-resource-loader');
const { defineResourceRoute } = await import('./define-resource-route');

beforeEach(() => {
  // Default: allow access. Individual tests override as needed.
  gateRouteAccessSpy.mockReset();
  gateRouteAccessSpy.mockImplementation(async () => true);
});

afterEach(() => {
  gateRouteAccessSpy.mockReset();
});

function makeArgs(params: Record<string, string>): LoaderFunctionArgs {
  return {
    request: new Request('http://test/'),
    params,
    context: {},
  } as unknown as LoaderFunctionArgs;
}

// Loaders return `Response | DataWithResponseInit<...>`. The tests reach into
// `.data` (envelope shape) or `.status` / `.headers` (redirect-Response shape)
// depending on the path under test. Narrowing helpers keep the assertions
// readable without sprinkling `as unknown as` everywhere.
type AnyLoaderResponse = {
  data?: unknown;
  status?: number;
  headers?: Headers;
};
function asAny(response: unknown): AnyLoaderResponse {
  return response as AnyLoaderResponse;
}

describe('runListLoader', () => {
  test('returns {restricted: true} when gate denies', async () => {
    gateRouteAccessSpy.mockImplementation(async () => false);
    const fetchSpy = mock(async () => [{ name: 'one' }]);

    const response = await runListLoader(makeArgs({ projectId: 'p1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: fetchSpy,
    });

    expect(response.data).toEqual({ restricted: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns {restricted: false, data, companions: {}} when allowed', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => [{ name: 'zone-a' }]);

    const response = await runListLoader(makeArgs({ projectId: 'p1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: fetchSpy,
    });

    expect(response.data).toEqual({
      restricted: false,
      data: [{ name: 'zone-a' }],
      companions: {},
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('throws BadRequestError when projectId is missing', async () => {
    let caught: Error | null = null;
    try {
      await runListLoader(makeArgs({}), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        fetch: async () => [],
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('Project ID');
  });

  test('forwards the correct args to gateRouteAccess', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    await runListLoader(makeArgs({ projectId: 'p1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      fetch: async () => [],
    });

    expect(gateRouteAccessSpy).toHaveBeenCalledTimes(1);
    expect(gateRouteAccessSpy).toHaveBeenCalledWith('p1', {
      resource: 'dnszones',
      verb: 'list',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      projectId: 'p1',
    });
  });

  test('meta defaults to cfg.resource when metaTitle is omitted', async () => {
    // `defineResourceRoute` is the page-side factory; it takes the page input
    // (no fetch/group/scope) and produces `meta`/`Page`. This test asserts the
    // meta function falls back to `resource` when `metaTitle` is omitted.
    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      restrictedMessage: 'no',
    });

    // route.meta is a MetaFunction; call it with a minimal args context.
    // mergeMeta walks args.matches so we pass an empty array. The wrapped
    // metaObject still produces a [{ title }, ...] tuple — we just want to
    // confirm the title contains 'dnszones'.
    const metaResult = route.meta({ matches: [] } as never);
    const titleEntry = (metaResult as Array<{ title?: string }>).find((m) => m.title !== undefined);
    expect(titleEntry?.title).toContain('dnszones');
  });

  test('cfg.fetch throws propagate out of the loader', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    let caught: Error | null = null;
    try {
      await runListLoader(makeArgs({ projectId: 'p1' }), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        fetch: async () => {
          throw new Error('fetch-explosion');
        },
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toBe('fetch-explosion');
  });

  test('org-scope: reads orgId from params, passes as 1st arg to gate', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => [{ name: 'project-a' }]);

    const response = await runListLoader(makeArgs({ orgId: 'org-1' }), {
      resource: 'projects',
      group: 'resourcemanager.miloapis.com',
      scope: 'org',
      fetch: fetchSpy,
    });

    expect(response.data).toEqual({
      restricted: false,
      data: [{ name: 'project-a' }],
      companions: {},
    });
    expect(gateRouteAccessSpy).toHaveBeenCalledWith('org-1', {
      resource: 'projects',
      verb: 'list',
      group: 'resourcemanager.miloapis.com',
      namespace: undefined,
      scope: 'org',
      projectId: undefined,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const fetchCtx = (fetchSpy.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(fetchCtx.orgId).toBe('org-1');
    expect(fetchCtx.projectId).toBeUndefined();
  });

  test('org-scope: throws BadRequestError when orgId is missing', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    let caught: Error | null = null;
    try {
      await runListLoader(makeArgs({}), {
        resource: 'projects',
        group: 'resourcemanager.miloapis.com',
        scope: 'org',
        fetch: async () => [],
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toContain('Organization ID');
  });

  test('user-scope: passes empty string as 1st arg to gate', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => [{ name: 'org-1' }]);

    const response = await runListLoader(makeArgs({}), {
      resource: 'organizations',
      scope: 'user',
      fetch: fetchSpy,
    });

    expect(response.data).toMatchObject({ restricted: false });
    expect(gateRouteAccessSpy).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        resource: 'organizations',
        scope: 'user',
      })
    );
  });
});

describe('runDetailLoader', () => {
  test('returns {restricted: true} when gate denies', async () => {
    gateRouteAccessSpy.mockImplementation(async () => false);
    const fetchSpy = mock(async () => ({ name: 'zone-a' }));

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: fetchSpy,
    });
    expect(asAny(response).data).toEqual({ restricted: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns {restricted: false, data, companions: {}} when allowed', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => ({ name: 'zone-a' }));

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: fetchSpy,
    });
    expect(asAny(response).data).toEqual({
      restricted: false,
      data: { name: 'zone-a' },
      companions: {},
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('throws Response(404) when fetch returns null', async () => {
    // `runDetailLoader` wraps thrown `AppError` (incl. `NotFoundError`) into a
    // `Response` so React Router serves the route error boundary with the
    // correct HTTP status. See `rethrowAsResponse` in run-resource-loader.ts.
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => null);

    let caught: unknown = null;
    try {
      await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        paramName: 'dnsZoneId',
        notFoundLabel: 'DNS',
        fetch: fetchSpy,
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    const response = caught as Response;
    expect(response.status).toBe(404);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain('DNS');
    expect(body.message).toContain('z1');
  });

  test('throws BadRequestError when paramName param is missing', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    let caught: Error | null = null;
    try {
      await runDetailLoader(makeArgs({ projectId: 'p1' }), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        paramName: 'dnsZoneId',
        notFoundLabel: 'DNS',
        fetch: async () => ({ name: 'z' }),
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('dnsZoneId');
  });

  test('forwards the correct args to gateRouteAccess (detail uses verb:get)', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
    });

    expect(gateRouteAccessSpy).toHaveBeenCalledTimes(1);
    expect(gateRouteAccessSpy).toHaveBeenCalledWith('p1', {
      resource: 'dnszones',
      verb: 'get',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      projectId: 'p1',
    });
  });

  test('throws BadRequestError when projectId is missing (detail variant)', async () => {
    let caught: Error | null = null;
    try {
      // intentionally no projectId
      await runDetailLoader(makeArgs({ dnsZoneId: 'z1' }), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        paramName: 'dnsZoneId',
        notFoundLabel: 'DNS',
        fetch: async () => ({ name: 'zone-a' }),
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('Project ID');
  });

  test('org-scope detail: reads orgId + id from params, gates with orgId', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => ({ name: 'group-a' }));

    const response = await runDetailLoader(makeArgs({ orgId: 'org-1', groupId: 'g1' }), {
      resource: 'groups',
      group: 'iam.miloapis.com',
      scope: 'org',
      paramName: 'groupId',
      notFoundLabel: 'Group',
      fetch: fetchSpy,
    });

    expect(asAny(response).data).toMatchObject({
      restricted: false,
      data: { name: 'group-a' },
    });
    expect(gateRouteAccessSpy).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        resource: 'groups',
        verb: 'get',
        scope: 'org',
      })
    );
    const fetchCtx = (fetchSpy.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(fetchCtx.orgId).toBe('org-1');
    expect(fetchCtx.id).toBe('g1');
  });

  test('user-scope detail: passes paramName id via check.name, empty 1st arg', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => ({ name: 'org-1' }));

    await runDetailLoader(makeArgs({ orgId: 'org-1' }), {
      resource: 'organizations',
      scope: 'user',
      paramName: 'orgId',
      notFoundLabel: 'Organization',
      fetch: fetchSpy,
    });

    expect(gateRouteAccessSpy).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        resource: 'organizations',
        verb: 'get',
        scope: 'user',
        name: 'org-1',
      })
    );
  });

  test('user-scope detail: throws Response(404) when fetch returns null', async () => {
    // See sibling test above — `runDetailLoader` wraps `NotFoundError` into a
    // `Response` so the route error boundary receives the correct HTTP status.
    gateRouteAccessSpy.mockImplementation(async () => true);

    let caught: unknown = null;
    try {
      await runDetailLoader(makeArgs({ orgId: 'org-1' }), {
        resource: 'organizations',
        scope: 'user',
        paramName: 'orgId',
        notFoundLabel: 'Organization',
        fetch: async () => null,
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    const response = caught as Response;
    expect(response.status).toBe(404);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain('Organization');
    expect(body.message).toContain('org-1');
  });
});

describe('runDetailLoader > companions', () => {
  test('user-scope companion gate passes URL param as check.name', async () => {
    const gateCalls: Array<{ resource: string; name?: string }> = [];
    gateRouteAccessSpy.mockImplementation((async (
      _org: string,
      check: { resource: string; name?: string }
    ) => {
      gateCalls.push({ resource: check.resource, name: check.name });
      return true;
    }) as unknown as () => Promise<boolean>);

    const response = await runDetailLoader(makeArgs({ orgId: 'org-wwxjm' }), {
      resource: 'organizations',
      group: 'resourcemanager.miloapis.com',
      scope: 'user',
      paramName: 'orgId',
      notFoundLabel: 'Organization',
      fetch: async () => ({ name: 'org-wwxjm' }),
      companions: {
        billingEnabled: {
          resource: 'organizations',
          group: 'resourcemanager.miloapis.com',
          verb: 'get',
          scope: 'user',
          onError: 'tolerate',
          fetch: async () => true,
        },
      },
    });

    expect(asAny(response).data).toMatchObject({
      restricted: false,
      companions: { billingEnabled: true },
    });
    expect(gateCalls).toEqual([
      { resource: 'organizations', name: 'org-wwxjm' },
      { resource: 'organizations', name: 'org-wwxjm' },
    ]);
  });

  test('companion fetch succeeds → returned alongside primary data', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a', domain: { name: 'd1' } }),
      companions: {
        domain: {
          resource: 'domains',
          group: 'networking.datumapis.com',
          scope: 'project',
          verb: 'get',
          onError: 'tolerate',
          fetch: async ({ data }) => ({
            name: (data as { domain: { name: string } }).domain.name,
          }),
        },
      },
    });
    expect(asAny(response).data).toMatchObject({
      restricted: false,
      data: { name: 'zone-a' },
      companions: { domain: { name: 'd1' } },
    });
  });

  test('companion fetch denied + tolerate → companion = null, primary data still returned', async () => {
    // Allow the primary dnszones gate, deny the companion domains gate.
    // Cast to a permissive signature — the underlying gateRouteAccess is invoked
    // with `(projectId, { resource, ... })`, but the spy was declared `() => boolean`
    // upstream so TypeScript needs an explicit widen here.
    gateRouteAccessSpy.mockImplementation((async (_org: string, check: { resource: string }) => {
      if (check.resource === 'dnszones') return true;
      return false;
    }) as unknown as () => Promise<boolean>);

    const fetchPrimary = mock(async () => ({ name: 'zone-a' }));
    const fetchCompanion = mock(async () => ({ name: 'd1' }));

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: fetchPrimary,
      companions: {
        domain: {
          resource: 'domains',
          group: 'networking.datumapis.com',
          scope: 'project',
          verb: 'get',
          onError: 'tolerate',
          fetch: fetchCompanion,
        },
      },
    });
    expect(asAny(response).data).toMatchObject({
      restricted: false,
      data: { name: 'zone-a' },
      companions: { domain: null },
    });
    expect(fetchCompanion).not.toHaveBeenCalled();
  });

  test('companion fetch throws + tolerate → companion = null', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
      companions: {
        domain: {
          resource: 'domains',
          group: 'networking.datumapis.com',
          scope: 'project',
          verb: 'get',
          onError: 'tolerate',
          fetch: async () => {
            throw new Error('boom');
          },
        },
      },
    });
    expect(asAny(response).data).toMatchObject({ companions: { domain: null } });
  });

  test('companion fetch throws + propagate → re-throws', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    let caught: Error | null = null;
    try {
      await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        paramName: 'dnsZoneId',
        notFoundLabel: 'DNS',
        fetch: async () => ({ name: 'zone-a' }),
        companions: {
          domain: {
            resource: 'domains',
            group: 'networking.datumapis.com',
            scope: 'project',
            verb: 'get',
            onError: 'propagate',
            fetch: async () => {
              throw new Error('boom');
            },
          },
        },
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toBe('boom');
  });

  test('companion gate denied + propagate → throws PermissionError', async () => {
    // Allow the primary dnszones gate, deny the companion domains gate.
    gateRouteAccessSpy.mockImplementation((async (_org: string, check: { resource: string }) => {
      if (check.resource === 'dnszones') return true;
      return false;
    }) as unknown as () => Promise<boolean>);

    let caught: Error | null = null;
    try {
      await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        paramName: 'dnsZoneId',
        notFoundLabel: 'DNS',
        fetch: async () => ({ name: 'zone-a' }),
        companions: {
          domain: {
            resource: 'domains',
            group: 'networking.datumapis.com',
            scope: 'project',
            verb: 'get',
            onError: 'propagate',
            fetch: async () => ({ name: 'd1' }),
          },
        },
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    // Should be PermissionError specifically (not plain Error)
    expect(caught?.constructor.name).toBe('PermissionError');
    expect(caught?.message).toContain('domain');
    expect(caught?.message).toContain('domains:get');
  });
});

describe('runDetailLoader > redirectIfDeleting', () => {
  test('returns redirect when descriptor truthy', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const fetchCompanion = mock(async () => ({ name: 'd1' }));

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a', deletionTimestamp: '2026-01-01T00:00:00Z' }),
      redirectIfDeleting: ({ data, projectId }) =>
        (data as { deletionTimestamp?: string }).deletionTimestamp
          ? {
              to: `/project/${projectId}/dns-zones`,
              toast: {
                title: 'DNS is being deleted',
                description: 'This DNS is currently being deleted and is no longer accessible',
                type: 'message' as const,
              },
            }
          : null,
      companions: {
        domain: {
          resource: 'domains',
          group: 'networking.datumapis.com',
          scope: 'project',
          verb: 'get',
          onError: 'tolerate',
          fetch: fetchCompanion,
        },
      },
    });
    // redirectWithToast returns a 302 response.
    expect(asAny(response).status).toBe(302);
    expect(asAny(response).headers?.get('Location')).toBe('/project/p1/dns-zones');
    // Sequencing invariant: redirect runs before companion fetch.
    expect(fetchCompanion).not.toHaveBeenCalled();
  });

  test('does not redirect when descriptor is null', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const response = await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
      redirectIfDeleting: () => null,
    });
    expect(asAny(response).data).toMatchObject({ restricted: false });
    // The non-redirect branch returns React Router's DataWithResponseInit, not a Response
    expect(response instanceof Response).toBe(false);
  });
});
