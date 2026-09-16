/**
 * The routes/backends read model the Backends tab renders from, plus the
 * relaxation of classifyHttpProxyComplexity that splicing made safe.
 */
import {
  classifyHttpProxyComplexity,
  toHttpProxy,
  toProxyLoadBalancer,
  toProxyRoutes,
} from './http-proxy.adapter';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

function proxy(spec: Record<string, unknown>): ComDatumapisNetworkingV1AlphaHttpProxy {
  return { metadata: { name: 'alb' }, spec } as ComDatumapisNetworkingV1AlphaHttpProxy;
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

describe('toProxyRoutes', () => {
  it('reads a weighted pool with stable keys', () => {
    const routes = toProxyRoutes(
      proxy({
        rules: [
          {
            matches: [{ path: { type: 'PathPrefix', value: '/' } }],
            backends: [
              { endpoint: 'https://a.example.com', weight: 70 },
              { endpoint: 'https://b.example.com', weight: 30 },
            ],
          },
        ],
      })
    );

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      key: 'rule:0',
      ruleIndex: 0,
      pathType: 'PathPrefix',
      path: '/',
      isRedirect: false,
      readOnly: false,
    });
    expect(routes[0].backends.map((b) => b.key)).toEqual(['0:0', '0:1']);
    expect(routes[0].backends.map((b) => b.weight)).toEqual([70, 30]);
  });

  it("applies the API's default weight of 1 when unset", () => {
    const routes = toProxyRoutes(proxy({ rules: [{ backends: [{ endpoint: 'https://a' }] }] }));
    expect(routes[0].backends[0].weight).toBe(1);
  });

  it('flags the synthesized redirect rule and keeps indexes aligned with spec.rules', () => {
    const routes = toProxyRoutes(
      proxy({ rules: [redirectRule, { backends: [{ endpoint: 'https://a' }] }] })
    );

    expect(routes[0]).toMatchObject({ isRedirect: true, readOnly: true, ruleIndex: 0 });
    expect(routes[1]).toMatchObject({ isRedirect: false, readOnly: false, ruleIndex: 1 });
  });

  describe('backend kinds', () => {
    it('classifies each kind and marks editability', () => {
      const routes = toProxyRoutes(
        proxy({
          rules: [
            {
              backends: [
                { endpoint: 'https://a.example.com' },
                { networkService: { name: 'checkout', port: 'http' } },
                { endpoint: 'https://tunnel.internal', connector: { name: 'laptop' } },
                { instance: { name: 'slice-1', port: 8080 } },
              ],
            },
          ],
        })
      );

      const backends = routes[0].backends;
      expect(backends.map((b) => b.kind)).toEqual([
        'endpoint',
        'networkService',
        'connector',
        'instance',
      ]);
      // Only the two kinds the backend editor can write are editable.
      expect(backends.map((b) => b.editable)).toEqual([true, true, false, false]);
    });

    it('reads a networkService named port', () => {
      const routes = toProxyRoutes(
        proxy({ rules: [{ backends: [{ networkService: { name: 'checkout', port: 'grpc' } }] }] })
      );
      expect(routes[0].backends[0].networkService).toEqual({ name: 'checkout', port: 'grpc' });
    });

    it('treats a connector backend as a connector, not an endpoint', () => {
      // A connector backend also carries `endpoint` — the tunnel's target.
      const routes = toProxyRoutes(
        proxy({
          rules: [
            { backends: [{ endpoint: 'https://tunnel.internal', connector: { name: 'l' } }] },
          ],
        })
      );
      expect(routes[0].backends[0].kind).toBe('connector');
      expect(routes[0].backends[0].endpoint).toBe('https://tunnel.internal');
    });

    it('marks a backend carrying its own filters uneditable', () => {
      const routes = toProxyRoutes(
        proxy({
          rules: [
            {
              backends: [
                { endpoint: 'https://a', filters: [{ type: 'URLRewrite', urlRewrite: {} }] },
              ],
            },
          ],
        })
      );
      expect(routes[0].backends[0].editable).toBe(false);
    });
  });

  describe('route readOnly', () => {
    it('is false for a single path match', () => {
      const routes = toProxyRoutes(
        proxy({ rules: [{ matches: [{ path: { type: 'Exact', value: '/a' } }], backends: [] }] })
      );
      expect(routes[0].readOnly).toBe(false);
    });

    it('is false when matches are absent (the API defaults them)', () => {
      expect(toProxyRoutes(proxy({ rules: [{ backends: [] }] }))[0].readOnly).toBe(false);
    });

    it('is true for a match that also keys off something else', () => {
      const routes = toProxyRoutes(
        proxy({
          rules: [{ matches: [{ path: { type: 'PathPrefix', value: '/' }, method: 'POST' }] }],
        })
      );
      expect(routes[0].readOnly).toBe(true);
    });

    it('is true for several matches', () => {
      const routes = toProxyRoutes(
        proxy({
          rules: [
            {
              matches: [
                { path: { type: 'PathPrefix', value: '/a' } },
                { path: { type: 'PathPrefix', value: '/b' } },
              ],
            },
          ],
        })
      );
      expect(routes[0].readOnly).toBe(true);
    });

    it('is true for a rule-level filter the portal does not manage', () => {
      const routes = toProxyRoutes(
        proxy({ rules: [{ backends: [], filters: [{ type: 'CORS', cors: {} }] }] })
      );
      expect(routes[0].readOnly).toBe(true);
    });

    it('is false for the portal-written Host and HSTS filters', () => {
      const routes = toProxyRoutes(
        proxy({
          rules: [
            {
              backends: [{ endpoint: 'https://a' }],
              filters: [
                { type: 'RequestHeaderModifier', requestHeaderModifier: { set: [] } },
                { type: 'ResponseHeaderModifier', responseHeaderModifier: { set: [] } },
              ],
            },
          ],
        })
      );
      expect(routes[0].readOnly).toBe(false);
    });
  });
});

describe('toProxyLoadBalancer', () => {
  it('is undefined when unset, so Envoy default applies', () => {
    expect(toProxyLoadBalancer(proxy({ rules: [] }))).toBeUndefined();
  });

  it('reads a plain algorithm', () => {
    expect(
      toProxyLoadBalancer(proxy({ rules: [], loadBalancer: { type: 'LeastRequest' } }))
    ).toEqual({ type: 'LeastRequest' });
  });

  it('reads ConsistentHash on a header', () => {
    expect(
      toProxyLoadBalancer(
        proxy({
          rules: [],
          loadBalancer: {
            type: 'ConsistentHash',
            consistentHash: { type: 'Header', header: 'x-user-id' },
          },
        })
      )
    ).toEqual({ type: 'ConsistentHash', consistentHash: { type: 'Header', header: 'x-user-id' } });
  });

  it('reads ConsistentHash on source IP, which carries no header', () => {
    expect(
      toProxyLoadBalancer(
        proxy({
          rules: [],
          loadBalancer: { type: 'ConsistentHash', consistentHash: { type: 'SourceIP' } },
        })
      )
    ).toEqual({ type: 'ConsistentHash', consistentHash: { type: 'SourceIP' } });
  });
});

describe('toHttpProxy surfaces the new model alongside the flat fields', () => {
  it('populates routes and loadBalancer without disturbing endpoint/origins', () => {
    const p = toHttpProxy(
      proxy({
        rules: [
          {
            backends: [
              { endpoint: 'https://a.example.com', weight: 70 },
              { endpoint: 'https://b.example.com', weight: 30 },
            ],
          },
        ],
        loadBalancer: { type: 'RoundRobin' },
      })
    );

    // Flat fields keep addressing the first origin, as Overview and the list expect.
    expect(p.endpoint).toBe('https://a.example.com');
    expect(p.origins).toEqual(['https://a.example.com', 'https://b.example.com']);
    // The structured view sits beside them.
    expect(p.routes?.[0].backends).toHaveLength(2);
    expect(p.loadBalancer).toEqual({ type: 'RoundRobin' });
  });

  it('leaves routes undefined when the resource has no rules', () => {
    expect(toHttpProxy(proxy({})).routes).toBeUndefined();
  });
});

describe('classifyHttpProxyComplexity after the splice relaxation', () => {
  it('no longer calls a multi-backend pool advanced', () => {
    // Writes splice now, so extra backends survive a flat-field edit.
    expect(
      classifyHttpProxyComplexity(
        proxy({
          rules: [{ backends: [{ endpoint: 'https://a' }, { endpoint: 'https://b', weight: 2 }] }],
        })
      )
    ).toBe('simple');
  });

  it('no longer calls multiple backend rules advanced', () => {
    expect(
      classifyHttpProxyComplexity(
        proxy({
          rules: [
            { backends: [{ endpoint: 'https://a' }] },
            {
              matches: [{ path: { type: 'PathPrefix', value: '/api' } }],
              backends: [{ endpoint: 'https://b' }],
            },
          ],
        })
      )
    ).toBe('simple');
  });

  it('still calls an unmanaged rule-level filter advanced', () => {
    expect(
      classifyHttpProxyComplexity(
        proxy({
          rules: [{ backends: [{ endpoint: 'https://a' }], filters: [{ type: 'CORS', cors: {} }] }],
        })
      )
    ).toBe('advanced');
  });

  it('still calls a filter on the edited backend advanced', () => {
    expect(
      classifyHttpProxyComplexity(
        proxy({
          rules: [
            {
              backends: [
                { endpoint: 'https://a', filters: [{ type: 'URLRewrite', urlRewrite: {} }] },
              ],
            },
          ],
        })
      )
    ).toBe('advanced');
  });

  it('ignores a filter on a backend the flat form never edits', () => {
    // The form edits backends[0]; a filter on a later backend does not make
    // its fields a half-truth, and the write preserves it either way.
    expect(
      classifyHttpProxyComplexity(
        proxy({
          rules: [
            {
              backends: [
                { endpoint: 'https://a' },
                { endpoint: 'https://b', filters: [{ type: 'URLRewrite', urlRewrite: {} }] },
              ],
            },
          ],
        })
      )
    ).toBe('simple');
  });
});
