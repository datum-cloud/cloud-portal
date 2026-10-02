import {
  HSTS_HEADER,
  HSTS_HEADER_VALUE,
  classifyHttpProxyComplexity,
  extractHsts,
  extractHstsHeaderValue,
  extractUpdatedAt,
  httpProxyPatchTouchesResource,
  toHttpProxy,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';
import type { HttpProxy } from './http-proxy.schema';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

const hostFilter = {
  type: 'RequestHeaderModifier' as const,
  requestHeaderModifier: { set: [{ name: 'Host', value: 'origin.internal' }] },
};
const hstsFilter = {
  type: 'ResponseHeaderModifier' as const,
  responseHeaderModifier: { set: [{ name: HSTS_HEADER, value: HSTS_HEADER_VALUE }] },
};

function rawProxy(
  filters?: NonNullable<
    NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules']
  >[number]['filters']
): ComDatumapisNetworkingV1AlphaHttpProxy {
  return {
    metadata: { name: 'alb' },
    spec: {
      rules: [
        {
          backends: [{ endpoint: 'https://origin.example.com' }],
          ...(filters && { filters }),
        },
      ],
    },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
}

const currentProxy: HttpProxy = {
  uid: 'u',
  name: 'alb',
  resourceVersion: '1',
  createdAt: new Date(0),
  endpoint: 'https://origin.example.com',
  enableHttpRedirect: true,
  hsts: false,
};

describe('HSTS filter modelling', () => {
  it('reads Strict-Transport-Security on the backend rule as hsts=true', () => {
    expect(extractHsts(rawProxy([hstsFilter]))).toBe(true);
    expect(toHttpProxy(rawProxy([hstsFilter])).hsts).toBe(true);
    expect(toHttpProxy(rawProxy()).hsts).toBe(false);
  });

  it('matches the header name case-insensitively', () => {
    const lower = {
      type: 'ResponseHeaderModifier' as const,
      responseHeaderModifier: { set: [{ name: 'strict-transport-security', value: 'max-age=1' }] },
    };
    expect(extractHsts(rawProxy([lower]))).toBe(true);
  });

  it('keeps portal-managed Host + HSTS filters form-editable', () => {
    expect(classifyHttpProxyComplexity(rawProxy([hstsFilter]))).toBe('host-only');
    expect(classifyHttpProxyComplexity(rawProxy([hostFilter, hstsFilter]))).toBe('host-only');
  });

  it('treats other response headers or duplicates as advanced', () => {
    const other = {
      type: 'ResponseHeaderModifier' as const,
      responseHeaderModifier: { set: [{ name: 'X-Frame-Options', value: 'DENY' }] },
    };
    expect(classifyHttpProxyComplexity(rawProxy([other]))).toBe('advanced');
    expect(classifyHttpProxyComplexity(rawProxy([hstsFilter, hstsFilter]))).toBe('advanced');
  });

  it('writes the HSTS filter on the backend rule when enabling', () => {
    const payload = toUpdateHttpProxyPayload({ hsts: true }, currentProxy);
    const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
    expect(backendRule?.filters).toEqual([hstsFilter]);
  });

  it('preserves HSTS when another rules field changes', () => {
    const payload = toUpdateHttpProxyPayload(
      { hostHeader: 'origin.internal' },
      { ...currentProxy, hsts: true }
    );
    const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
    expect(backendRule?.filters).toEqual([hostFilter, hstsFilter]);
  });

  it('drops the HSTS filter when disabling', () => {
    const payload = toUpdateHttpProxyPayload({ hsts: false }, { ...currentProxy, hsts: true });
    const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
    expect(backendRule?.filters).toBeUndefined();
  });

  describe('hand-tuned header value', () => {
    const tuned = 'max-age=63072000; includeSubDomains; preload';
    const tunedFilter = {
      type: 'ResponseHeaderModifier' as const,
      responseHeaderModifier: { set: [{ name: 'strict-transport-security', value: tuned }] },
    };

    it('reads the value as written and keeps the proxy form-editable', () => {
      expect(extractHstsHeaderValue(rawProxy([tunedFilter]))).toBe(tuned);
      const proxy = toHttpProxy(rawProxy([tunedFilter]));
      expect(proxy.hsts).toBe(true);
      expect(proxy.hstsHeaderValue).toBe(tuned);
      expect(proxy.complexity).toBe('host-only');
      expect(toHttpProxy(rawProxy()).hstsHeaderValue).toBeUndefined();
    });

    it('re-emits the tuned value when an unrelated rules field changes', () => {
      const payload = toUpdateHttpProxyPayload(
        { hostHeader: 'origin.internal' },
        { ...currentProxy, hsts: true, hstsHeaderValue: tuned }
      );
      const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
      expect(backendRule?.filters).toEqual([
        hostFilter,
        {
          type: 'ResponseHeaderModifier',
          responseHeaderModifier: { set: [{ name: HSTS_HEADER, value: tuned }] },
        },
      ]);
    });

    it('writes the portal default only when HSTS is explicitly enabled', () => {
      const payload = toUpdateHttpProxyPayload(
        { hsts: true },
        { ...currentProxy, hsts: false, hstsHeaderValue: undefined }
      );
      const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
      expect(backendRule?.filters).toEqual([hstsFilter]);
    });
  });
});

describe('extractUpdatedAt', () => {
  const withManagedFields = (
    managedFields: NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['metadata']>['managedFields']
  ): ComDatumapisNetworkingV1AlphaHttpProxy =>
    ({ metadata: { name: 'alb', managedFields } }) as ComDatumapisNetworkingV1AlphaHttpProxy;

  it('picks the newest non-status write', () => {
    const raw = withManagedFields([
      { manager: 'portal', operation: 'Update', time: '2026-09-01T10:00:00Z' },
      { manager: 'portal', operation: 'Update', time: '2026-09-03T10:00:00Z' },
      {
        manager: 'operator',
        operation: 'Update',
        subresource: 'status',
        time: '2026-09-10T10:00:00Z',
      },
    ]);
    expect(extractUpdatedAt(raw)?.toISOString()).toBe('2026-09-03T10:00:00.000Z');
  });

  it('returns undefined without managedFields', () => {
    expect(extractUpdatedAt(withManagedFields(undefined))).toBeUndefined();
    expect(toHttpProxy(rawProxy()).updatedAt).toBeUndefined();
  });
});

describe('toUpdateHttpProxyPayload', () => {
  it('omits metadata and spec for protection-only updates', () => {
    const payload = toUpdateHttpProxyPayload({
      trafficProtectionMode: 'Enforce',
      paranoiaLevels: { blocking: 2, detection: 2 },
    });

    expect(payload).toEqual({
      kind: 'HTTPProxy',
      apiVersion: 'networking.datumapis.com/v1alpha',
    });
    expect(httpProxyPatchTouchesResource(payload)).toBe(false);
  });

  it('includes spec when hostnames change', () => {
    const payload = toUpdateHttpProxyPayload({ hostnames: ['app.example.com'] });
    expect(httpProxyPatchTouchesResource(payload)).toBe(true);
    expect(payload.spec?.hostnames).toEqual(['app.example.com']);
  });
});

describe('toHttpProxy compute backends', () => {
  it('reads a networkService backend and workload-name label', () => {
    const proxy = toHttpProxy({
      metadata: {
        name: 'storefront',
        labels: { 'compute.datumapis.com/workload-name': 'storefront' },
      },
      spec: {
        rules: [{ backends: [{ networkService: { name: 'storefront', port: 'http' } }] }],
      },
    } as ComDatumapisNetworkingV1AlphaHttpProxy);

    expect(proxy.networkService).toEqual({ name: 'storefront', port: 'http' });
    expect(proxy.workloadName).toBe('storefront');
    expect(proxy.endpoint).toBeUndefined();
    expect(proxy.origins).toBeUndefined();
  });

  describe('toUpdateHttpProxyPayload', () => {
    const proxyWithNetworkService: HttpProxy = {
      uid: 'u',
      name: 'storefront',
      resourceVersion: '1',
      createdAt: new Date(0),
      networkService: { name: 'storefront', port: 'http' },
      workloadName: 'storefront',
      enableHttpRedirect: false,
      hsts: false,
    };

    it('keeps the networkService backend when rules are rebuilt for HSTS', () => {
      const payload = toUpdateHttpProxyPayload({ hsts: true }, proxyWithNetworkService);
      const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
      expect(backendRule?.backends[0]).toEqual({
        networkService: { name: 'storefront', port: 'http' },
      });
      expect(backendRule?.filters).toEqual([hstsFilter]);
    });

    it('keeps the networkService backend when the redirect toggles', () => {
      const payload = toUpdateHttpProxyPayload(
        { enableHttpRedirect: true },
        proxyWithNetworkService
      );
      const rules = payload.spec?.rules ?? [];
      expect(rules).toHaveLength(2);
      const backendRule = rules.find((r) => 'backends' in r);
      expect(backendRule?.backends).toEqual([
        { networkService: { name: 'storefront', port: 'http' } },
      ]);
    });

    it('lets an explicit endpoint replace the networkService backend', () => {
      const payload = toUpdateHttpProxyPayload(
        { endpoint: 'https://origin.example.com' },
        proxyWithNetworkService
      );
      const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
      expect(backendRule?.backends).toEqual([{ endpoint: 'https://origin.example.com' }]);
    });
  });
});

describe('multiple backends', () => {
  const twoBackends = {
    metadata: { name: 'alb' },
    spec: {
      rules: [
        {
          backends: [
            { endpoint: 'https://a.example.com', weight: 3 },
            { endpoint: 'https://10.0.0.1', weight: 1, tls: { hostname: 'b.internal' } },
          ],
        },
      ],
    },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
  const twoBackendRules = {
    metadata: { name: 'alb' },
    spec: {
      rules: [
        { backends: [{ endpoint: 'https://a.example.com' }] },
        { backends: [{ endpoint: 'https://b.example.com' }] },
      ],
    },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
  const backendRule = (payload: ReturnType<typeof toUpdateHttpProxyPayload>) =>
    payload.spec?.rules?.find((r) => 'backends' in r);

  it('keeps several backends in one rule editable', () => {
    expect(classifyHttpProxyComplexity(twoBackends)).toBe('simple');
  });

  it('classifies several backend rules as advanced', () => {
    expect(classifyHttpProxyComplexity(twoBackendRules)).toBe('advanced');
  });

  it('refuses to rebuild the rules of an advanced proxy', () => {
    // The rebuild writes one backend rule, so it would drop the others.
    const advanced = toHttpProxy(twoBackendRules);
    for (const input of [
      { endpoint: 'https://c.example.com' },
      { backends: [{ endpoint: 'https://c.example.com' }] },
      { enableHttpRedirect: false },
      { hsts: true },
      { hostHeader: 'origin.internal' },
      { tlsHostname: 'origin.internal' },
    ]) {
      expect(() => toUpdateHttpProxyPayload(input, advanced)).toThrow(/backends/);
    }
  });

  it('still allows edits that leave the rules alone on an advanced proxy', () => {
    const advanced = toHttpProxy(twoBackendRules);
    const payload = toUpdateHttpProxyPayload({ hostnames: ['app.example.com'] }, advanced);
    expect(payload.spec).toEqual({ hostnames: ['app.example.com'] });
  });

  it('keeps every backend, weight, and TLS hostname when another rules field changes', () => {
    const current = toHttpProxy(twoBackends);
    for (const input of [{ hsts: true }, { enableHttpRedirect: true }, { hostHeader: 'x' }]) {
      expect(backendRule(toUpdateHttpProxyPayload(input, current))?.backends).toEqual([
        { endpoint: 'https://a.example.com', weight: 3 },
        { endpoint: 'https://10.0.0.1', weight: 1, tls: { hostname: 'b.internal' } },
      ]);
    }
  });

  it('refuses single-origin edits that cannot say which backend they mean', () => {
    const current = toHttpProxy(twoBackends);
    expect(() => toUpdateHttpProxyPayload({ endpoint: 'https://c.example.com' }, current)).toThrow(
      /backends/
    );
    expect(() => toUpdateHttpProxyPayload({ tlsHostname: 'c.internal' }, current)).toThrow(
      /backends/
    );
  });

  it('writes the backends list in order with weights and TLS hostnames', () => {
    const payload = toUpdateHttpProxyPayload(
      {
        backends: [
          { endpoint: 'https://a.example.com', weight: 2 },
          { endpoint: 'https://10.0.0.2', tlsHostname: ' c.internal ' },
          { endpoint: 'http://d.example.com', weight: 0, tlsHostname: '' },
        ],
      },
      currentProxy
    );
    expect(backendRule(payload)?.backends).toEqual([
      { endpoint: 'https://a.example.com', weight: 2 },
      { endpoint: 'https://10.0.0.2', tls: { hostname: 'c.internal' } },
      { endpoint: 'http://d.example.com', weight: 0 },
    ]);
  });

  it('keeps the redirect rule and rule filters when writing backends', () => {
    const payload = toUpdateHttpProxyPayload(
      { backends: [{ endpoint: 'https://a.example.com' }, { endpoint: 'https://b.example.com' }] },
      { ...currentProxy, hsts: true, hostHeader: 'origin.internal' }
    );
    expect(payload.spec?.rules).toHaveLength(2);
    expect(backendRule(payload)?.filters).toEqual([hostFilter, hstsFilter]);
  });

  it('rejects an empty backends list', () => {
    expect(() => toUpdateHttpProxyPayload({ backends: [] }, currentProxy)).toThrow(/backend/);
  });

  it('keeps a connector on a single backend and refuses to spread it across several', () => {
    const viaConnector: HttpProxy = { ...currentProxy, connector: { name: 'laptop' } };
    const single = toUpdateHttpProxyPayload(
      { backends: [{ endpoint: 'http://localhost:8080' }] },
      viaConnector
    );
    expect(backendRule(single)?.backends).toEqual([
      { endpoint: 'http://localhost:8080', connector: { name: 'laptop' } },
    ]);
    expect(() =>
      toUpdateHttpProxyPayload(
        { backends: [{ endpoint: 'http://a:1' }, { endpoint: 'http://b:2' }] },
        viaConnector
      )
    ).toThrow(/connector/i);
  });
});

describe('load balancing and health checks', () => {
  it('sets and clears the load balancer without rebuilding rules', () => {
    expect(
      toUpdateHttpProxyPayload({ loadBalancer: { type: 'LeastRequest' } }, currentProxy).spec
    ).toEqual({ loadBalancer: { type: 'LeastRequest' } });
    // null is a merge-patch delete.
    expect(toUpdateHttpProxyPayload({ loadBalancer: null }, currentProxy).spec).toEqual({
      loadBalancer: null,
    });
  });

  it('sets and clears passive health checks without rebuilding rules', () => {
    const healthCheck = { passive: { consecutive5xxErrors: 3, baseEjectionTime: '1m' } };
    expect(toUpdateHttpProxyPayload({ healthCheck }, currentProxy).spec).toEqual({ healthCheck });
    expect(toUpdateHttpProxyPayload({ healthCheck: null }, currentProxy).spec).toEqual({
      healthCheck: null,
    });
  });
});

describe('backend modelling', () => {
  it('reads each URL backend with its weight, TLS hostname, and connector', () => {
    const proxy = toHttpProxy({
      metadata: { name: 'alb' },
      spec: {
        loadBalancer: { type: 'ConsistentHash', consistentHash: { type: 'SourceIP' } },
        healthCheck: { passive: { consecutive5xxErrors: 3 } },
        rules: [
          {
            backends: [
              { endpoint: 'https://a.example.com', weight: 3 },
              { endpoint: 'https://10.0.0.1', tls: { hostname: 'b.internal' }, weight: 0 },
              { endpoint: 'http://c.internal', connector: { name: 'laptop' } },
            ],
          },
        ],
      },
    } as ComDatumapisNetworkingV1AlphaHttpProxy);

    expect(proxy.backends).toEqual([
      { endpoint: 'https://a.example.com', weight: 3 },
      { endpoint: 'https://10.0.0.1', weight: 0, tlsHostname: 'b.internal' },
      { endpoint: 'http://c.internal', connector: { name: 'laptop' } },
    ]);
    expect(proxy.loadBalancer).toEqual({
      type: 'ConsistentHash',
      consistentHash: { type: 'SourceIP' },
    });
    expect(proxy.healthCheck).toEqual({ passive: { consecutive5xxErrors: 3 } });
  });

  it('leaves the fields unset when the spec has none', () => {
    const proxy = toHttpProxy({
      metadata: { name: 'alb' },
      spec: { rules: [{ backends: [{ networkService: { name: 'svc', port: 'http' } }] }] },
    } as unknown as ComDatumapisNetworkingV1AlphaHttpProxy);
    expect(proxy.backends).toEqual([{ networkService: { name: 'svc', port: 'http' } }]);
    expect(proxy.loadBalancer).toBeUndefined();
    expect(proxy.healthCheck).toBeUndefined();
  });
});

describe('routing the rebuild cannot round-trip', () => {
  const withRule = (rule: object) =>
    ({
      metadata: { name: 'alb' },
      spec: { rules: [rule] },
    }) as ComDatumapisNetworkingV1AlphaHttpProxy;

  it('treats backends it cannot re-emit as advanced', () => {
    // An EndpointSlice instance backend.
    expect(
      classifyHttpProxyComplexity(withRule({ backends: [{ instance: { name: 'pod' } }] }))
    ).toBe('advanced');
    // A NetworkService alongside a URL round-trips.
    expect(
      classifyHttpProxyComplexity(
        withRule({
          backends: [{ endpoint: 'https://a.com' }, { networkService: { name: 's', port: 'h' } }],
        })
      )
    ).toBe('simple');
    // A single NetworkService is still editable.
    expect(
      classifyHttpProxyComplexity(
        withRule({ backends: [{ networkService: { name: 's', port: 'h' } }] })
      )
    ).toBe('simple');
  });

  it('treats a connector alongside other backends as advanced', () => {
    expect(
      classifyHttpProxyComplexity(
        withRule({
          backends: [
            { endpoint: 'http://a:1', connector: { name: 'laptop' } },
            { endpoint: 'https://b.com' },
          ],
        })
      )
    ).toBe('advanced');
  });

  it('treats a backend rule narrower than catch-all as advanced', () => {
    const backends = [{ endpoint: 'https://a.com' }];
    expect(
      classifyHttpProxyComplexity(
        withRule({ backends, matches: [{ path: { type: 'PathPrefix', value: '/api' } }] })
      )
    ).toBe('advanced');
    expect(
      classifyHttpProxyComplexity(
        withRule({ backends, matches: [{ path: { type: 'PathPrefix', value: '/' } }] })
      )
    ).toBe('simple');
    expect(classifyHttpProxyComplexity(withRule({ backends, matches: [] }))).toBe('simple');
  });

  it('refuses a rules rebuild without the current proxy', () => {
    expect(() => toUpdateHttpProxyPayload({ hsts: true })).toThrow(/Reload/);
    expect(() => toUpdateHttpProxyPayload({ backends: [{ endpoint: 'https://a.com' }] })).toThrow(
      /Reload/
    );
  });

  it('passes nested nulls through so a merge patch can clear stale hash settings', () => {
    const payload = toUpdateHttpProxyPayload(
      { loadBalancer: { type: 'RoundRobin', consistentHash: null } },
      currentProxy
    );
    expect(payload.spec).toEqual({ loadBalancer: { type: 'RoundRobin', consistentHash: null } });
  });
});

describe('NetworkService backends', () => {
  const mixed = {
    metadata: { name: 'alb' },
    spec: {
      rules: [
        {
          backends: [
            { endpoint: 'https://a.example.com', weight: 3 },
            { networkService: { name: 'storefront', port: 'http' }, weight: 1 },
          ],
        },
      ],
    },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
  const backendRule = (payload: ReturnType<typeof toUpdateHttpProxyPayload>) =>
    payload.spec?.rules?.find((r) => 'backends' in r);

  it('reads URL and NetworkService backends side by side', () => {
    expect(toHttpProxy(mixed).backends).toEqual([
      { endpoint: 'https://a.example.com', weight: 3 },
      { networkService: { name: 'storefront', port: 'http' }, weight: 1 },
    ]);
  });

  it('keeps a mixed list as it is when another rules field changes', () => {
    const payload = toUpdateHttpProxyPayload({ hsts: true }, toHttpProxy(mixed));
    expect(backendRule(payload)?.backends).toEqual([
      { endpoint: 'https://a.example.com', weight: 3 },
      { networkService: { name: 'storefront', port: 'http' }, weight: 1 },
    ]);
  });

  it('writes NetworkService backends without TLS or a connector', () => {
    const payload = toUpdateHttpProxyPayload(
      {
        backends: [
          { networkService: { name: 'storefront', port: 'http' }, weight: 2 },
          { endpoint: 'https://10.0.0.1', weight: 1, tlsHostname: 'b.internal' },
        ],
      },
      currentProxy
    );
    expect(backendRule(payload)?.backends).toEqual([
      { networkService: { name: 'storefront', port: 'http' }, weight: 2 },
      { endpoint: 'https://10.0.0.1', weight: 1, tls: { hostname: 'b.internal' } },
    ]);
  });

  it('refuses to put a NetworkService behind a connector', () => {
    expect(() =>
      toUpdateHttpProxyPayload(
        { backends: [{ networkService: { name: 'storefront', port: 'http' } }] },
        { ...currentProxy, connector: { name: 'laptop' } }
      )
    ).toThrow(/connector/i);
  });
});
