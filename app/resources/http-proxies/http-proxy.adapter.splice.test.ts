/**
 * The flat fields (endpoint, TLS, Host header, HSTS, Force HTTPS) address one
 * origin on one rule. `spec.rules` can hold far more than that: a weighted pool
 * of up to 16 backends per rule, backend-level filters, non-path matches, and
 * connector / instance / networkService backend kinds.
 *
 * These tests pin the contract that editing a flat field never disturbs any of
 * it. Before the splice refactor every one of them failed — the writer rebuilt
 * `spec.rules` from the flat fields alone, so changing the Host header silently
 * collapsed a five-backend pool down to one.
 */
import {
  HSTS_HEADER,
  HSTS_HEADER_VALUE,
  toHttpProxy,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

type Rule = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules']
>[number];

function proxyWithRules(rules: unknown[]): ComDatumapisNetworkingV1AlphaHttpProxy {
  return {
    metadata: { name: 'alb', uid: 'u', resourceVersion: '1' },
    spec: { rules: rules as Rule[] },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
}

/** Rules as they come back for a weighted three-backend pool. */
const weightedPool = [
  {
    backends: [
      { endpoint: 'https://origin-primary.example.com', weight: 50 },
      { endpoint: 'https://origin-eu.example.com', weight: 30 },
      { endpoint: 'https://origin-canary.example.com', weight: 20 },
    ],
  },
];

/** Pull the one rule that carries backends out of a payload. */
function backendRuleOf(payload: ReturnType<typeof toUpdateHttpProxyPayload>) {
  return payload.spec?.rules?.find(
    (r) => 'backends' in r && Array.isArray(r.backends) && r.backends.length > 0
  ) as { backends: Array<Record<string, unknown>>; filters?: unknown[] } | undefined;
}

describe('flat-field writes preserve the rest of the pool', () => {
  it('keeps every backend and weight when the Host header changes', () => {
    const current = toHttpProxy(proxyWithRules(weightedPool));
    const payload = toUpdateHttpProxyPayload({ hostHeader: 'origin.internal' }, current);

    const rule = backendRuleOf(payload);
    expect(rule?.backends).toHaveLength(3);
    expect(rule?.backends.map((b) => b.weight)).toEqual([50, 30, 20]);
    expect(rule?.backends.map((b) => b.endpoint)).toEqual([
      'https://origin-primary.example.com',
      'https://origin-eu.example.com',
      'https://origin-canary.example.com',
    ]);
  });

  it('keeps every backend when HSTS is toggled', () => {
    const current = toHttpProxy(proxyWithRules(weightedPool));
    const payload = toUpdateHttpProxyPayload({ hsts: true }, current);
    expect(backendRuleOf(payload)?.backends).toHaveLength(3);
  });

  it('keeps every backend when Force HTTPS is toggled on', () => {
    const current = toHttpProxy(proxyWithRules(weightedPool));
    const payload = toUpdateHttpProxyPayload({ enableHttpRedirect: true }, current);

    expect(backendRuleOf(payload)?.backends).toHaveLength(3);
    // The redirect rule has to lead: one sitting behind the backend rule never runs.
    expect(payload.spec?.rules?.[0]).toMatchObject({
      filters: [{ type: 'RequestRedirect', requestRedirect: { scheme: 'https', statusCode: 301 } }],
    });
  });

  it('applies endpoint and TLS to the first backend only', () => {
    const current = toHttpProxy(proxyWithRules(weightedPool));
    const payload = toUpdateHttpProxyPayload(
      { endpoint: 'https://new-primary.example.com', tlsHostname: 'new-primary.example.com' },
      current
    );

    const backends = backendRuleOf(payload)?.backends ?? [];
    expect(backends[0]).toMatchObject({
      endpoint: 'https://new-primary.example.com',
      tls: { hostname: 'new-primary.example.com' },
      weight: 50,
    });
    // The others are untouched — no endpoint rewrite, no TLS bleed.
    expect(backends[1]).toEqual({ endpoint: 'https://origin-eu.example.com', weight: 30 });
    expect(backends[2]).toEqual({ endpoint: 'https://origin-canary.example.com', weight: 20 });
  });
});

describe('flat-field writes preserve shapes the flat model cannot represent', () => {
  it('keeps a networkService backend', () => {
    const current = toHttpProxy(
      proxyWithRules([
        {
          backends: [
            { endpoint: 'https://origin.example.com', weight: 1 },
            { networkService: { name: 'checkout', port: 'http' }, weight: 1 },
          ],
        },
      ])
    );
    const payload = toUpdateHttpProxyPayload({ hostHeader: 'origin.internal' }, current);

    expect(backendRuleOf(payload)?.backends[1]).toEqual({
      networkService: { name: 'checkout', port: 'http' },
      weight: 1,
    });
  });

  it('keeps a connector backend', () => {
    const current = toHttpProxy(
      proxyWithRules([
        { backends: [{ endpoint: 'https://tunnel.internal', connector: { name: 'laptop' } }] },
      ])
    );
    const payload = toUpdateHttpProxyPayload({ hsts: true }, current);

    expect(backendRuleOf(payload)?.backends[0]).toMatchObject({ connector: { name: 'laptop' } });
  });

  it('keeps backend-level filters', () => {
    const backendFilter = {
      type: 'URLRewrite',
      urlRewrite: { path: { type: 'ReplacePrefixMatch', replacePrefixMatch: '/v2' } },
    };
    const current = toHttpProxy(
      proxyWithRules([
        { backends: [{ endpoint: 'https://o.example.com', filters: [backendFilter] }] },
      ])
    );
    const payload = toUpdateHttpProxyPayload({ hostHeader: 'origin.internal' }, current);

    expect(backendRuleOf(payload)?.backends[0].filters).toEqual([backendFilter]);
  });

  it('keeps non-path matches on the backend rule', () => {
    const matches = [{ path: { type: 'PathPrefix', value: '/api' }, method: 'POST' }];
    const current = toHttpProxy(
      proxyWithRules([{ matches, backends: [{ endpoint: 'https://o.example.com' }] }])
    );
    const payload = toUpdateHttpProxyPayload({ hsts: true }, current);

    expect((backendRuleOf(payload) as unknown as { matches: unknown }).matches).toEqual(matches);
  });

  it('keeps a filter type the portal does not manage, in its original position', () => {
    const cors = { type: 'CORS', cors: { allowOrigins: ['https://app.example.com'] } };
    const current = toHttpProxy(
      proxyWithRules([{ backends: [{ endpoint: 'https://o.example.com' }], filters: [cors] }])
    );
    const payload = toUpdateHttpProxyPayload({ hostHeader: 'origin.internal' }, current);

    const filters = backendRuleOf(payload)?.filters ?? [];
    expect(filters).toContainEqual(cors);
    expect(filters).toContainEqual({
      type: 'RequestHeaderModifier',
      requestHeaderModifier: { set: [{ name: 'Host', value: 'origin.internal' }] },
    });
  });

  it('removes only the HSTS filter when HSTS is cleared', () => {
    const cors = { type: 'CORS', cors: { allowOrigins: ['https://app.example.com'] } };
    const hsts = {
      type: 'ResponseHeaderModifier',
      responseHeaderModifier: { set: [{ name: HSTS_HEADER, value: HSTS_HEADER_VALUE }] },
    };
    const current = toHttpProxy(
      proxyWithRules([{ backends: [{ endpoint: 'https://o.example.com' }], filters: [cors, hsts] }])
    );
    const payload = toUpdateHttpProxyPayload({ hsts: false }, current);

    expect(backendRuleOf(payload)?.filters).toEqual([cors]);
  });

  it('leaves a second backend rule alone', () => {
    const apiRule = {
      matches: [{ path: { type: 'PathPrefix', value: '/api' } }],
      backends: [{ endpoint: 'https://api.example.com', weight: 1 }],
    };
    const current = toHttpProxy(
      proxyWithRules([{ backends: [{ endpoint: 'https://www.example.com' }] }, apiRule])
    );
    const payload = toUpdateHttpProxyPayload({ hostHeader: 'origin.internal' }, current);

    expect(payload.spec?.rules?.[1]).toEqual(apiRule);
  });

  it('does not mutate the rules it was handed', () => {
    const raw = proxyWithRules(weightedPool);
    const current = toHttpProxy(raw);
    toUpdateHttpProxyPayload({ endpoint: 'https://replaced.example.com' }, current);

    expect(raw.spec?.rules?.[0].backends?.[0].endpoint).toBe('https://origin-primary.example.com');
  });
});

describe('fallback when there are no rules to preserve', () => {
  it('synthesizes the flat shape for a hand-built proxy', () => {
    const payload = toUpdateHttpProxyPayload(
      { endpoint: 'https://o.example.com', hostHeader: 'origin.internal' },
      {
        uid: 'u',
        name: 'alb',
        resourceVersion: '1',
        createdAt: new Date(0),
        enableHttpRedirect: false,
      }
    );

    expect(payload.spec?.rules).toEqual([
      {
        backends: [{ endpoint: 'https://o.example.com' }],
        filters: [
          {
            type: 'RequestHeaderModifier',
            requestHeaderModifier: { set: [{ name: 'Host', value: 'origin.internal' }] },
          },
        ],
      },
    ]);
  });

  it('carries the connector through the fallback path', () => {
    const payload = toUpdateHttpProxyPayload(
      { hsts: true },
      {
        uid: 'u',
        name: 'alb',
        resourceVersion: '1',
        createdAt: new Date(0),
        endpoint: 'https://tunnel.internal',
        connector: { name: 'laptop' },
      }
    );

    expect(backendRuleOf(payload)?.backends[0]).toMatchObject({ connector: { name: 'laptop' } });
  });
});
