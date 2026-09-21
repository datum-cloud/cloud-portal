/// <reference types="bun-types/test" />
import type { LoaderPermissionCheck } from './server/check-permission';
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { LoaderFunctionArgs } from 'react-router';

// Module-level mocks for the gate primitives. We hold mutable refs the tests
// can reconfigure per case. ESM namespace objects are frozen at runtime, so we
// cannot reassign `gateModule.gateRouteAccess` directly — `mock.module` is the
// supported Bun primitive for this.
//
// `runListLoader` / `runRouteGate` still gate through `gateRouteAccess` (one
// check each). `runDetailLoader` resolves the route gate and every companion
// gate through a single `canInLoaderBulk`, then records denials separately via
// `recordGateDenial` at the point each verdict is acted on — so all three need
// stubbing. Leaving `canInLoaderBulk` real would construct an RbacService,
// throw, get swallowed by its fail-closed catch, and silently turn every detail
// route in this suite into `{ restricted: true }`.
const gateRouteAccessSpy = mock(async () => true);
const canInLoaderBulkSpy = mock(async (_organizationId: string, checks: LoaderPermissionCheck[]) =>
  checks.map(() => true)
);
const recordGateDenialSpy = mock((_check: LoaderPermissionCheck) => {});

// `mock.module` replaces the module in Bun's global registry for the rest of
// the test run (not just this file), so any export we omit here becomes
// undefined for every other test file that imports the same module. Capture
// the real modules first, then spread their exports and override only what
// this suite needs.
const actualCheckPermission = await import('./server/check-permission');
const actualCookies = await import('@/utils/cookies');

// Snapshot the real exports BY VALUE. `mock.module` mutates the live ESM
// namespace object in place, so restoring from `actualCheckPermission` itself
// would hand the next test file our spies back instead of the real functions —
// which is exactly the cross-file leak the afterAll below exists to prevent.
const realCheckPermission = { ...actualCheckPermission };
const realCookies = { ...actualCookies };

mock.module('./server/check-permission', () => ({
  ...actualCheckPermission,
  gateRouteAccess: (...args: unknown[]) => gateRouteAccessSpy(...(args as [])),
  canInLoaderBulk: (organizationId: string, checks: LoaderPermissionCheck[]) =>
    canInLoaderBulkSpy(organizationId, checks),
  recordGateDenial: (check: LoaderPermissionCheck) => recordGateDenialSpy(check),
}));

// Stub `@/utils/cookies` so `redirectWithToast` does not touch the real
// cookie/env stack. The descriptor's `toast` may lack `description` (which the
// production ToastSchema requires), so the stub bypasses Zod parsing and
// returns a plain redirect Response. Tests assert on `status` + `Location`
// only, which matches the real `redirectWithToast` contract.
mock.module('@/utils/cookies', () => ({
  ...actualCookies,
  redirectWithToast: async (url: string) =>
    new Response(null, { status: 302, headers: { Location: url } }),
}));

// Import AFTER the mock is registered so the SUT picks up the mocked module.
// The DSL is now split: `define-resource-route` is client-safe (Page/meta/handle)
// and `run-resource-loader` is the server-only loader runtime. Tests target the
// server-only runtime directly since loader behavior is what we want to assert.
const { runListLoader, runDetailLoader } = await import('./run-resource-loader');
const { defineResourceRoute } = await import('./define-resource-route');

// Bun's mock.module replaces these modules in the global registry for the
// rest of the test run, not just this file. Reinstall the untouched real
// modules once this file's tests finish so later test files see the
// genuine implementations again.
afterAll(() => {
  mock.module('./server/check-permission', () => realCheckPermission);
  mock.module('@/utils/cookies', () => realCookies);
});

beforeEach(() => {
  // Default: allow access. Individual tests override as needed.
  gateRouteAccessSpy.mockReset();
  gateRouteAccessSpy.mockImplementation(async () => true);
  canInLoaderBulkSpy.mockReset();
  canInLoaderBulkSpy.mockImplementation(async (_organizationId, checks) => checks.map(() => true));
  recordGateDenialSpy.mockReset();
});

afterEach(() => {
  gateRouteAccessSpy.mockReset();
  canInLoaderBulkSpy.mockReset();
  recordGateDenialSpy.mockReset();
});

/**
 * Every check `runDetailLoader` gated, flattened across calls — the same view
 * the old per-call `gateRouteAccess` spy gave, now that the route gate and the
 * companion gates share one bulk call. Dedupe lives inside the real
 * `canInLoaderBulk`, so the loader still passes one check per declaration here.
 */
const gatedChecks = (): LoaderPermissionCheck[] =>
  canInLoaderBulkSpy.mock.calls.flatMap((call) => call[1] as LoaderPermissionCheck[]);

/** Allow only the named resources; everything else is denied. */
const allowResources = (allow: string[]) => {
  canInLoaderBulkSpy.mockImplementation(async (_organizationId, checks) =>
    checks.map((check) => allow.includes(check.resource))
  );
};

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
    canInLoaderBulkSpy.mockImplementation(async (_organizationId, checks) =>
      checks.map(() => false)
    );
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

  test('forwards the correct args to the bulk gate (detail uses verb:get)', async () => {
    await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
    });

    // One round trip for the whole route: a single bulk call carrying the route
    // gate (and, on routes that declare them, every companion gate).
    expect(canInLoaderBulkSpy).toHaveBeenCalledTimes(1);
    expect(canInLoaderBulkSpy).toHaveBeenCalledWith('p1', [
      {
        resource: 'dnszones',
        verb: 'get',
        group: 'dns.networking.miloapis.com',
        namespace: 'default',
        scope: 'project',
        projectId: 'p1',
        name: undefined,
      },
    ]);
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
    expect(canInLoaderBulkSpy).toHaveBeenCalledWith('org-1', [
      expect.objectContaining({
        resource: 'groups',
        verb: 'get',
        scope: 'org',
      }),
    ]);
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

    expect(canInLoaderBulkSpy).toHaveBeenCalledWith('', [
      expect.objectContaining({
        resource: 'organizations',
        verb: 'get',
        scope: 'user',
        name: 'org-1',
      }),
    ]);
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
    // The loader still submits one check per declaration — the route gate and
    // the companion gate — and both carry the URL param as `check.name`.
    // Collapsing the two identical reviews into one upstream call is
    // `canInLoaderBulk`'s job, covered in check-permission.test.ts.
    expect(gatedChecks().map((check) => ({ resource: check.resource, name: check.name }))).toEqual([
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
    allowResources(['dnszones']);

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
    allowResources(['dnszones']);

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

/**
 * `runDetailLoader` resolves the route gate and every companion gate in a single
 * bulk call, then runs the allowed companion fetches concurrently. These tests
 * pin the three invariants that make that safe — denial accounting, error
 * precedence, and no orphaned promises — each of which a naive "decide as you go"
 * implementation gets wrong.
 */
describe('runDetailLoader > companions: concurrency and denial accounting', () => {
  /** A dnszones detail route with the given companions. */
  const dnsZoneRoute = (companions: Record<string, unknown>) => ({
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project' as const,
    paramName: 'dnsZoneId',
    notFoundLabel: 'DNS',
    fetch: async () => ({ name: 'zone-a' }),
    companions: companions as never,
  });

  const companion = (over: Record<string, unknown> = {}) => ({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project' as const,
    verb: 'get' as const,
    onError: 'tolerate' as const,
    fetch: async () => ({ name: 'd1' }),
    ...over,
  });

  test('gates the route and every companion in one bulk call, in declaration order', async () => {
    await runDetailLoader(
      makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
      dnsZoneRoute({
        first: companion({ resource: 'domains' }),
        second: companion({ resource: 'httpproxies', verb: 'list' }),
      })
    );

    expect(canInLoaderBulkSpy).toHaveBeenCalledTimes(1);
    expect(gatedChecks().map((check) => `${check.resource}:${check.verb}`)).toEqual([
      'dnszones:get',
      'domains:get',
      'httpproxies:list',
    ]);
  });

  test('route denied records exactly one denial, and never a companion one', async () => {
    // The regression this design exists to prevent: companion gates are now
    // issued even when the route gate denies, so recording a denial at issue
    // time rather than at consumption time would start counting
    // `rbac_permission_denied_total{resource="domains"}` for users who never got
    // past the dnszones gate.
    canInLoaderBulkSpy.mockImplementation(async (_organizationId, checks) =>
      checks.map(() => false)
    );

    const response = await runDetailLoader(
      makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
      dnsZoneRoute({ domain: companion() })
    );

    expect(asAny(response).data).toEqual({ restricted: true });
    expect(recordGateDenialSpy).toHaveBeenCalledTimes(1);
    expect(recordGateDenialSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'dnszones', verb: 'get' })
    );
  });

  test('primary 404 records no companion denial', async () => {
    allowResources(['dnszones']);

    let caught: unknown = null;
    try {
      await runDetailLoader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }), {
        ...dnsZoneRoute({ domain: companion() }),
        fetch: async () => null,
      });
    } catch (e) {
      caught = e;
    }

    expect((caught as Response).status).toBe(404);
    expect(recordGateDenialSpy).not.toHaveBeenCalled();
  });

  test('companion gate denied + tolerate records exactly one denial for that companion', async () => {
    allowResources(['dnszones']);

    await runDetailLoader(
      makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
      dnsZoneRoute({ domain: companion() })
    );

    expect(recordGateDenialSpy).toHaveBeenCalledTimes(1);
    expect(recordGateDenialSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'domains', verb: 'get' })
    );
  });

  test('companion fetches run concurrently', async () => {
    // `first` cannot settle until `second` has started. A sequential
    // implementation deadlocks, so race against a timeout to fail fast rather
    // than hang the suite.
    let releaseFirst: () => void = () => {};
    const secondStarted = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const loading = runDetailLoader(
      makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
      dnsZoneRoute({
        first: companion({
          fetch: async () => {
            await secondStarted;
            return { name: 'first' };
          },
        }),
        second: companion({
          resource: 'httpproxies',
          fetch: async () => {
            releaseFirst();
            return { name: 'second' };
          },
        }),
      })
    );

    const response = await Promise.race([
      loading,
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('companion fetches did not overlap')), 1000)
      ),
    ]);

    expect(asAny(response).data).toMatchObject({
      companions: { first: { name: 'first' }, second: { name: 'second' } },
    });
  });

  test('the first declared failure wins, regardless of failure kind', async () => {
    // `first` fails on its fetch, `second` on its gate. The sequential loop
    // would have thrown `first`'s error and never reached `second`; deciding
    // gate denials before fetch rejections would let `second` win instead.
    allowResources(['dnszones', 'domains']);

    let caught: Error | null = null;
    try {
      await runDetailLoader(
        makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
        dnsZoneRoute({
          first: companion({
            onError: 'propagate',
            fetch: async () => {
              throw new Error('a-boom');
            },
          }),
          second: companion({ resource: 'httpproxies', onError: 'propagate' }),
        })
      );
    } catch (e) {
      caught = e as Error;
    }

    expect(caught?.message).toBe('a-boom');
  });

  test('a propagating gate denial does not orphan an in-flight sibling fetch', async () => {
    // `first`'s fetch is already running when `second`'s denial throws. If pass 1
    // threw mid-loop, `first`'s rejection would have no handler and surface as a
    // process-level unhandled rejection instead of a route error.
    allowResources(['dnszones', 'domains']);

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    let caught: Error | null = null;
    try {
      await runDetailLoader(
        makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
        dnsZoneRoute({
          first: companion({
            fetch: async () => {
              throw new Error('orphan');
            },
          }),
          second: companion({ resource: 'httpproxies', onError: 'propagate' }),
        })
      );
    } catch (e) {
      caught = e as Error;
    }

    // Give the microtask queue a turn so any unhandled rejection is reported.
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.off('unhandledRejection', onUnhandled);

    expect(caught?.constructor.name).toBe('PermissionError');
    expect(caught?.message).toContain('second');
    expect(unhandled).toEqual([]);
  });

  test('a tolerated companion failure does not affect its siblings', async () => {
    const response = await runDetailLoader(
      makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }),
      dnsZoneRoute({
        first: companion({
          fetch: async () => {
            throw new Error('boom');
          },
        }),
        second: companion({ resource: 'httpproxies' }),
      })
    );

    expect(asAny(response).data).toMatchObject({
      companions: { first: null, second: { name: 'd1' } },
    });
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
    // Companion verdicts are resolved up front but never consumed on this path,
    // so no denial is recorded for a gate the request never acted on.
    expect(recordGateDenialSpy).not.toHaveBeenCalled();
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
