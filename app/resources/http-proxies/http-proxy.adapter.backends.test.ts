import {
  HSTS_HEADER,
  HSTS_HEADER_VALUE,
  classifyHttpProxyComplexity,
  toHttpProxy,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

type RawBackends = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules']
>[number]['backends'];

function rawProxy(
  backends: RawBackends,
  spec: Partial<NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>> = {}
): ComDatumapisNetworkingV1AlphaHttpProxy {
  return {
    metadata: { name: 'alb' },
    spec: { rules: [{ backends }], ...spec },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
}

const pool = rawProxy([
  { endpoint: 'https://storefront-blue.fly.dev', weight: 95 },
  { endpoint: 'https://storefront-green.fly.dev', weight: 5 },
  { networkService: { name: 'storefront', port: 'http' } },
]);

function backendRule(payload: ReturnType<typeof toUpdateHttpProxyPayload>) {
  return payload.spec?.rules?.find((rule) => 'backends' in rule) as
    { backends: Array<Record<string, unknown>>; filters?: unknown[] } | undefined;
}

describe('backend pool modelling', () => {
  it('reads every backend with its kind and effective weight', () => {
    const proxy = toHttpProxy(pool);
    expect(proxy.backends?.map((b) => [b.kind, b.weight])).toEqual([
      ['endpoint', 95],
      ['endpoint', 5],
      ['networkService', 1],
    ]);
    expect(proxy.endpoint).toBe('https://storefront-blue.fly.dev');
  });

  it('keeps a weighted pool form-editable', () => {
    expect(classifyHttpProxyComplexity(pool)).toBe('simple');
  });

  it('reads the algorithm and passive health check', () => {
    const proxy = toHttpProxy(
      rawProxy([{ endpoint: 'https://a.example.com' }], {
        loadBalancer: { type: 'ConsistentHash', consistentHash: { type: 'SourceIP' } },
        healthCheck: { passive: { consecutive5xxErrors: 3 } },
      })
    );
    expect(proxy.loadBalancer).toEqual({
      type: 'ConsistentHash',
      consistentHash: { type: 'SourceIP' },
    });
    expect(proxy.healthCheck).toEqual({ passive: { consecutive5xxErrors: 3 } });
  });
});

describe('rules rebuilds keep the pool', () => {
  const current = toHttpProxy(pool);

  it('re-emits every backend when HSTS toggles', () => {
    const rule = backendRule(toUpdateHttpProxyPayload({ hsts: true }, current));
    expect(rule?.backends).toEqual([
      { endpoint: 'https://storefront-blue.fly.dev', weight: 95 },
      { endpoint: 'https://storefront-green.fly.dev', weight: 5 },
      { networkService: { name: 'storefront', port: 'http' } },
    ]);
    expect(rule?.filters).toEqual([
      {
        type: 'ResponseHeaderModifier',
        responseHeaderModifier: { set: [{ name: HSTS_HEADER, value: HSTS_HEADER_VALUE }] },
      },
    ]);
  });

  it('applies a TLS hostname change to the first backend only', () => {
    const rule = backendRule(toUpdateHttpProxyPayload({ tlsHostname: 'blue.internal' }, current));
    expect(rule?.backends[0]).toEqual({
      endpoint: 'https://storefront-blue.fly.dev',
      weight: 95,
      tls: { hostname: 'blue.internal' },
    });
    expect(rule?.backends[1]).toEqual({ endpoint: 'https://storefront-green.fly.dev', weight: 5 });
  });

  it('replaces the pool when backends are passed', () => {
    const rule = backendRule(
      toUpdateHttpProxyPayload(
        {
          backends: [
            { raw: current.backends![0].raw, weight: 50 },
            { endpoint: 'https://canary.example.com', weight: 0, tlsHostname: ' ' },
          ],
        },
        current
      )
    );
    expect(rule?.backends).toEqual([
      { endpoint: 'https://storefront-blue.fly.dev', weight: 50 },
      { endpoint: 'https://canary.example.com', weight: 0 },
    ]);
  });

  it('keeps fields the form does not own when an endpoint is edited', () => {
    const filters = [{ type: 'RequestHeaderModifier', requestHeaderModifier: { set: [] } }];
    const rule = backendRule(
      toUpdateHttpProxyPayload(
        {
          backends: [
            {
              endpoint: 'https://new.example.com',
              weight: 3,
              raw: { endpoint: 'https://old.example.com', tls: { hostname: 'x' }, filters },
            },
          ],
        },
        current
      )
    );
    expect(rule?.backends).toEqual([{ endpoint: 'https://new.example.com', weight: 3, filters }]);
  });
});

describe('load balancer and health check patches', () => {
  it('nulls consistentHash when leaving ConsistentHash', () => {
    const payload = toUpdateHttpProxyPayload({ loadBalancer: { type: 'RoundRobin' } });
    expect(payload.spec).toEqual({ loadBalancer: { type: 'RoundRobin', consistentHash: null } });
    expect(payload.spec?.rules).toBeUndefined();
  });

  it('nulls the header when hashing on source IP', () => {
    const payload = toUpdateHttpProxyPayload({
      loadBalancer: {
        type: 'ConsistentHash',
        consistentHash: { type: 'SourceIP', header: 'x-user' },
      },
    });
    expect(payload.spec?.loadBalancer).toEqual({
      type: 'ConsistentHash',
      consistentHash: { type: 'SourceIP', header: null },
    });
  });

  it('clears the algorithm and health check with null', () => {
    const payload = toUpdateHttpProxyPayload({ loadBalancer: null, healthCheck: null });
    expect(payload.spec).toEqual({ loadBalancer: null, healthCheck: null });
  });

  it('writes every passive field', () => {
    const payload = toUpdateHttpProxyPayload({
      healthCheck: {
        passive: { consecutive5xxErrors: 5, baseEjectionTime: '30s', maxEjectionPercent: 50 },
      },
    });
    expect(payload.spec?.healthCheck).toEqual({
      passive: { consecutive5xxErrors: 5, baseEjectionTime: '30s', maxEjectionPercent: 50 },
    });
  });
});
