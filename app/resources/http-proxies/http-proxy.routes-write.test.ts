/**
 * The Backends tab's writer. Like the flat-field writer it splices, so the
 * things the routes model does not describe survive a pool edit.
 */
import {
  toHttpProxy,
  toUpdateProxyLoadBalancerPayload,
  toUpdateProxyRoutesPayload,
} from './http-proxy.adapter';
import type { ProxyRoute } from './http-proxy.schema';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

function proxy(rules: unknown[]): ComDatumapisNetworkingV1AlphaHttpProxy {
  return { metadata: { name: 'alb' }, spec: { rules } } as ComDatumapisNetworkingV1AlphaHttpProxy;
}

/** The backends of a spliced rule, typed for assertions. */
function backendsOf(rule: Record<string, unknown>): Array<Record<string, unknown>> {
  return rule.backends as Array<Record<string, unknown>>;
}

/** Read a proxy, then write its routes back with `edit` applied. */
function roundTrip(rules: unknown[], edit: (routes: ProxyRoute[]) => ProxyRoute[]) {
  const current = toHttpProxy(proxy(rules));
  const routes = edit(current.routes ?? []);
  const payload = toUpdateProxyRoutesPayload(routes, (current.rawRules ?? []) as never);
  return payload.spec?.rules as Array<Record<string, unknown>>;
}

const redirectRule = {
  matches: [
    {
      path: { type: 'PathPrefix', value: '/' },
      headers: [{ name: 'x-forwarded-proto', type: 'Exact', value: 'http' }],
    },
  ],
  filters: [{ type: 'RequestRedirect', requestRedirect: { scheme: 'https', statusCode: 301 } }],
};

describe('toUpdateProxyRoutesPayload', () => {
  it('writes reweighted backends', () => {
    const rules = roundTrip(
      [
        {
          backends: [
            { endpoint: 'https://a', weight: 50 },
            { endpoint: 'https://b', weight: 50 },
          ],
        },
      ],
      (routes) =>
        routes.map((r) => ({
          ...r,
          backends: r.backends.map((b, i) => ({ ...b, weight: i === 0 ? 90 : 10 })),
        }))
    );

    expect(rules[0].backends).toEqual([
      { endpoint: 'https://a', weight: 90 },
      { endpoint: 'https://b', weight: 10 },
    ]);
  });

  it('appends a new backend to an existing pool', () => {
    const rules = roundTrip([{ backends: [{ endpoint: 'https://a', weight: 1 }] }], (routes) =>
      routes.map((r) => ({
        ...r,
        backends: [
          ...r.backends,
          {
            // A backend with no `${rule}:${index}` origin is new.
            key: 'new-1',
            kind: 'endpoint' as const,
            endpoint: 'https://b',
            weight: 3,
            editable: true,
          },
        ],
      }))
    );

    expect(rules[0].backends).toEqual([
      { endpoint: 'https://a', weight: 1 },
      { endpoint: 'https://b', weight: 3 },
    ]);
  });

  it('removes a backend the caller left out', () => {
    const rules = roundTrip(
      [
        {
          backends: [
            { endpoint: 'https://a', weight: 1 },
            { endpoint: 'https://b', weight: 1 },
          ],
        },
      ],
      (routes) => routes.map((r) => ({ ...r, backends: r.backends.slice(0, 1) }))
    );

    expect(rules[0].backends).toHaveLength(1);
    expect(rules[0].backends).toEqual([{ endpoint: 'https://a', weight: 1 }]);
  });

  it('writes a networkService backend without TLS, which the API forbids there', () => {
    const rules = roundTrip([{ backends: [{ endpoint: 'https://a', weight: 1 }] }], (routes) =>
      routes.map((r) => ({
        ...r,
        backends: [
          {
            key: 'new-1',
            kind: 'networkService' as const,
            networkService: { name: 'checkout', port: 'http' },
            weight: 2,
            editable: true,
          },
        ],
      }))
    );

    expect(rules[0].backends).toEqual([
      { networkService: { name: 'checkout', port: 'http' }, weight: 2 },
    ]);
  });

  it('clears the previous target when a backend changes kind', () => {
    // The API forbids two targets on one backend, so the endpoint must go.
    const rules = roundTrip(
      [{ backends: [{ endpoint: 'https://a', tls: { hostname: 'a.example.com' }, weight: 1 }] }],
      (routes) =>
        routes.map((r) => ({
          ...r,
          backends: r.backends.map((b) => ({
            ...b,
            kind: 'networkService' as const,
            networkService: { name: 'checkout', port: 'http' },
            endpoint: undefined,
            tlsHostname: undefined,
          })),
        }))
    );

    expect(backendsOf(rules[0])[0]).toEqual({
      networkService: { name: 'checkout', port: 'http' },
      weight: 1,
    });
  });

  describe('preserves what the routes model does not describe', () => {
    it('keeps the force-HTTPS rule even when the caller omits it', () => {
      // The TLS card owns that toggle; a pool edit must not turn it off.
      const rules = roundTrip([redirectRule, { backends: [{ endpoint: 'https://a' }] }], (routes) =>
        routes.filter((r) => !r.isRedirect)
      );

      expect(rules).toHaveLength(2);
      expect(rules[0]).toEqual(redirectRule);
    });

    it('keeps the redirect rule first, ahead of the backend rules', () => {
      const rules = roundTrip([redirectRule, { backends: [{ endpoint: 'https://a' }] }], (routes) =>
        routes.filter((r) => !r.isRedirect)
      );
      expect(rules[0]).toEqual(redirectRule);
      expect(rules[1].backends).toBeDefined();
    });

    it('keeps rule-level Host and HSTS filters on an edited route', () => {
      const filters = [
        {
          type: 'RequestHeaderModifier',
          requestHeaderModifier: { set: [{ name: 'Host', value: 'o.internal' }] },
        },
      ];
      const rules = roundTrip(
        [{ backends: [{ endpoint: 'https://a', weight: 1 }], filters }],
        (routes) =>
          routes.map((r) => ({
            ...r,
            backends: r.backends.map((b) => ({ ...b, weight: 5 })),
          }))
      );

      expect(rules[0].filters).toEqual(filters);
      expect(backendsOf(rules[0])[0].weight).toBe(5);
    });

    it('passes a connector backend through untouched', () => {
      const rules = roundTrip(
        [{ backends: [{ endpoint: 'https://tunnel.internal', connector: { name: 'laptop' } }] }],
        (routes) => routes
      );

      expect(backendsOf(rules[0])[0]).toEqual({
        endpoint: 'https://tunnel.internal',
        connector: { name: 'laptop' },
      });
    });

    it('passes an instance backend through untouched', () => {
      const rules = roundTrip(
        [{ backends: [{ instance: { name: 'slice-1', port: 8080 }, weight: 4 }] }],
        (routes) => routes
      );
      expect(backendsOf(rules[0])[0]).toEqual({
        instance: { name: 'slice-1', port: 8080 },
        weight: 4,
      });
    });

    it('keeps a backend-level filter, and does not rewrite that backend', () => {
      const filters = [
        { type: 'URLRewrite', urlRewrite: { path: { type: 'ReplacePrefixMatch' } } },
      ];
      const rules = roundTrip(
        [{ backends: [{ endpoint: 'https://a', filters, weight: 2 }] }],
        (routes) => routes
      );
      expect(backendsOf(rules[0])[0]).toEqual({ endpoint: 'https://a', filters, weight: 2 });
    });

    it('passes a read-only route through untouched', () => {
      const oddRule = {
        matches: [{ path: { type: 'PathPrefix', value: '/' }, method: 'POST' }],
        backends: [{ endpoint: 'https://a' }],
      };
      const rules = roundTrip([oddRule], (routes) => routes);
      expect(rules[0]).toEqual(oddRule);
    });

    it('does not mutate the rules it was handed', () => {
      const raw = proxy([{ backends: [{ endpoint: 'https://a', weight: 1 }] }]);
      const current = toHttpProxy(raw);
      toUpdateProxyRoutesPayload(
        (current.routes ?? []).map((r) => ({
          ...r,
          backends: r.backends.map((b) => ({ ...b, weight: 99 })),
        })),
        (current.rawRules ?? []) as never
      );

      expect(raw.spec?.rules?.[0].backends?.[0].weight).toBe(1);
    });
  });

  describe('routes', () => {
    it('writes an edited path', () => {
      const rules = roundTrip(
        [{ matches: [{ path: { type: 'PathPrefix', value: '/' } }], backends: [] }],
        (routes) => routes.map((r) => ({ ...r, path: '/api', pathType: 'Exact' as const }))
      );
      expect(rules[0].matches).toEqual([{ path: { type: 'Exact', value: '/api' } }]);
    });

    it('adds a route with a negative ruleIndex, which has no rule to splice onto', () => {
      const rules = roundTrip([{ backends: [{ endpoint: 'https://a' }] }], (routes) => [
        ...routes,
        {
          key: 'new-route',
          ruleIndex: -1,
          path: '/api',
          pathType: 'PathPrefix',
          isRedirect: false,
          readOnly: false,
          backends: [
            { key: 'new-1', kind: 'endpoint', endpoint: 'https://api', weight: 1, editable: true },
          ],
        },
      ]);

      expect(rules).toHaveLength(2);
      expect(rules[1]).toEqual({
        matches: [{ path: { type: 'PathPrefix', value: '/api' } }],
        backends: [{ endpoint: 'https://api', weight: 1 }],
      });
    });

    it('deletes a route the caller left out', () => {
      const rules = roundTrip(
        [
          { backends: [{ endpoint: 'https://a' }] },
          {
            matches: [{ path: { type: 'PathPrefix', value: '/api' } }],
            backends: [{ endpoint: 'https://b' }],
          },
        ],
        (routes) => routes.slice(0, 1)
      );

      expect(rules).toHaveLength(1);
      expect(rules[0].backends).toEqual([{ endpoint: 'https://a', weight: 1 }]);
    });
  });
});

describe('toUpdateProxyLoadBalancerPayload', () => {
  it('sets an algorithm', () => {
    expect(toUpdateProxyLoadBalancerPayload({ type: 'LeastRequest' }).spec?.loadBalancer).toEqual({
      type: 'LeastRequest',
    });
  });

  it('sends null to clear it, which a merge-patch treats as a delete', () => {
    expect(toUpdateProxyLoadBalancerPayload(null).spec?.loadBalancer).toBeNull();
  });

  it('carries the consistent-hash source', () => {
    const payload = toUpdateProxyLoadBalancerPayload({
      type: 'ConsistentHash',
      consistentHash: { type: 'Header', header: 'x-user-id' },
    });
    expect(payload.spec?.loadBalancer).toEqual({
      type: 'ConsistentHash',
      consistentHash: { type: 'Header', header: 'x-user-id' },
    });
  });

  it('does not touch rules', () => {
    expect(toUpdateProxyLoadBalancerPayload(null).spec?.rules).toBeUndefined();
  });
});
