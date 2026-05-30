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

describe('defineResourceRoute > list', () => {
  test('returns {restricted: true} when gate denies', async () => {
    gateRouteAccessSpy.mockImplementation(async () => false);
    const fetchSpy = mock(async () => [{ name: 'one' }]);

    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: fetchSpy,
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1' }));

    expect(response.data).toEqual({ restricted: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns {restricted: false, data, companions: {}} when allowed', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => [{ name: 'zone-a' }]);

    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: fetchSpy,
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1' }));

    expect(response.data).toEqual({
      restricted: false,
      data: [{ name: 'zone-a' }],
      companions: {},
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('throws BadRequestError when projectId is missing', async () => {
    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: async () => [],
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({}));
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('Project ID');
  });

  test('forwards the correct args to gateRouteAccess', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      fetch: async () => [],
      restrictedMessage: 'no',
    });

    await route.loader(makeArgs({ projectId: 'p1' }));

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
    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: async () => [],
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
    const route = defineResourceRoute({
      type: 'list',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      fetch: async () => {
        throw new Error('fetch-explosion');
      },
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({ projectId: 'p1' }));
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toBe('fetch-explosion');
  });
});

describe('defineResourceRoute > detail', () => {
  test('returns {restricted: true} when gate denies', async () => {
    gateRouteAccessSpy.mockImplementation(async () => false);
    const fetchSpy = mock(async () => ({ name: 'zone-a' }));

    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: fetchSpy,
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    expect(asAny(response).data).toEqual({ restricted: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns {restricted: false, data, companions: {}} when allowed', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => ({ name: 'zone-a' }));

    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: fetchSpy,
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    expect(asAny(response).data).toEqual({
      restricted: false,
      data: { name: 'zone-a' },
      companions: {},
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('throws NotFoundError when fetch returns null', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const fetchSpy = mock(async () => null);

    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: fetchSpy,
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('DNS');
    expect(caught?.message).toContain('z1');
  });

  test('throws BadRequestError when paramName param is missing', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'z' }),
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({ projectId: 'p1' }));
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('dnsZoneId');
  });

  test('forwards the correct args to gateRouteAccess (detail uses verb:get)', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);
    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
      restrictedMessage: 'no',
    });

    await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));

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
    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({ dnsZoneId: 'z1' })); // intentionally no projectId
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toContain('Project ID');
  });
});

describe('defineResourceRoute > detail > companions', () => {
  test('companion fetch succeeds → returned alongside primary data', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const route = defineResourceRoute({
      type: 'detail',
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
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
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

    const route = defineResourceRoute({
      type: 'detail',
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
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    expect(asAny(response).data).toMatchObject({
      restricted: false,
      data: { name: 'zone-a' },
      companions: { domain: null },
    });
    expect(fetchCompanion).not.toHaveBeenCalled();
  });

  test('companion fetch throws + tolerate → companion = null', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const route = defineResourceRoute({
      type: 'detail',
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
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    expect(asAny(response).data).toMatchObject({ companions: { domain: null } });
  });

  test('companion fetch throws + propagate → re-throws', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const route = defineResourceRoute({
      type: 'detail',
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
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
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

    const route = defineResourceRoute({
      type: 'detail',
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
      restrictedMessage: 'no',
    });

    let caught: Error | null = null;
    try {
      await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
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

describe('defineResourceRoute > detail > redirectIfDeleting', () => {
  test('returns redirect when descriptor truthy', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const fetchCompanion = mock(async () => ({ name: 'd1' }));

    const route = defineResourceRoute({
      type: 'detail',
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
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    // redirectWithToast returns a 302 response.
    expect(asAny(response).status).toBe(302);
    expect(asAny(response).headers?.get('Location')).toBe('/project/p1/dns-zones');
    // Sequencing invariant: redirect runs before companion fetch.
    expect(fetchCompanion).not.toHaveBeenCalled();
  });

  test('does not redirect when descriptor is null', async () => {
    gateRouteAccessSpy.mockImplementation(async () => true);

    const route = defineResourceRoute({
      type: 'detail',
      resource: 'dnszones',
      group: 'dns.networking.miloapis.com',
      scope: 'project',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      fetch: async () => ({ name: 'zone-a' }),
      redirectIfDeleting: () => null,
      restrictedMessage: 'no',
    });

    const response = await route.loader(makeArgs({ projectId: 'p1', dnsZoneId: 'z1' }));
    expect(asAny(response).data).toMatchObject({ restricted: false });
    // The non-redirect branch returns React Router's DataWithResponseInit, not a Response
    expect(response instanceof Response).toBe(false);
  });
});
