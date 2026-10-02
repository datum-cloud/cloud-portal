import {
  type BackendsFormValues,
  backendsFormSchema,
  emptyBackendRow,
  toBackendsFormValues,
  toBackendsUpdateInput,
} from './proxy-backends-form';
import type { HttpProxy } from '@/resources/http-proxies';
import { describe, expect, it } from 'bun:test';

function proxy(overrides: Partial<HttpProxy> = {}): HttpProxy {
  return { uid: 'u', name: 'alb', resourceVersion: '1', createdAt: new Date(0), ...overrides };
}

function values(overrides: Partial<BackendsFormValues> = {}): BackendsFormValues {
  return {
    backends: [{ ...emptyBackendRow(), endpointHost: 'a.example.com' }],
    loadBalancer: 'default',
    hashOn: 'SourceIP',
    hashHeader: '',
    healthCheckEnabled: false,
    consecutive5xxErrors: 5,
    baseEjectionTime: '30s',
    maxEjectionPercent: 50,
    ...overrides,
  };
}

function issues(input: BackendsFormValues): Record<string, string> {
  const result = backendsFormSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('toBackendsFormValues', () => {
  it('loads each backend with its weight, TLS hostname, port, and path', () => {
    const form = toBackendsFormValues(
      proxy({
        backends: [
          { endpoint: 'https://a.example.com:8443/api', weight: 3 },
          { endpoint: 'http://10.0.0.1', tlsHostname: 'b.internal' },
        ],
        loadBalancer: { type: 'ConsistentHash', consistentHash: { type: 'Header', header: 'x-u' } },
        healthCheck: { passive: { consecutive5xxErrors: 2 } },
      })
    );
    expect(form.backends).toEqual([
      { ...emptyBackendRow(), endpointHost: 'a.example.com:8443/api', weight: 3 },
      {
        ...emptyBackendRow(),
        protocol: 'http',
        endpointHost: '10.0.0.1',
        tlsHostname: 'b.internal',
      },
    ]);
    expect(form.loadBalancer).toBe('ConsistentHash');
    expect(form.hashOn).toBe('Header');
    expect(form.hashHeader).toBe('x-u');
    expect(form.healthCheckEnabled).toBe(true);
    expect(form.consecutive5xxErrors).toBe(2);
    // Unset fields fall back to the API defaults.
    expect(form.baseEjectionTime).toBe('30s');
    expect(form.maxEjectionPercent).toBe(50);
  });

  it('falls back to the single endpoint, and to one empty row', () => {
    expect(
      toBackendsFormValues(proxy({ endpoint: 'https://x.example.com', tlsHostname: 't' })).backends
    ).toEqual([{ ...emptyBackendRow(), endpointHost: 'x.example.com', tlsHostname: 't' }]);
    expect(toBackendsFormValues(proxy()).backends).toEqual([emptyBackendRow()]);
    expect(toBackendsFormValues(proxy()).loadBalancer).toBe('default');
  });
});

describe('toBackendsUpdateInput', () => {
  it('writes weights only when there are several backends', () => {
    expect(toBackendsUpdateInput(values(), proxy()).backends).toEqual([
      { endpoint: 'https://a.example.com', tlsHostname: '' },
    ]);
    const several = values({
      backends: [
        { ...emptyBackendRow(), endpointHost: 'a.example.com', weight: 3 },
        { ...emptyBackendRow(), protocol: 'http', endpointHost: 'b.example.com:8080/x', weight: 1 },
      ],
    });
    expect(toBackendsUpdateInput(several, proxy()).backends).toEqual([
      { endpoint: 'https://a.example.com', weight: 3, tlsHostname: '' },
      { endpoint: 'http://b.example.com:8080/x', weight: 1, tlsHostname: '' },
    ]);
  });

  it('removes load balancing and health checks only when they were set', () => {
    expect(toBackendsUpdateInput(values(), proxy())).not.toHaveProperty('loadBalancer');
    expect(toBackendsUpdateInput(values(), proxy())).not.toHaveProperty('healthCheck');
    const configured = proxy({
      loadBalancer: { type: 'Random' },
      healthCheck: { passive: { consecutive5xxErrors: 3 } },
    });
    const input = toBackendsUpdateInput(values(), configured);
    expect(input.loadBalancer).toBeNull();
    expect(input.healthCheck).toBeNull();
  });

  it('writes the chosen algorithm and what a consistent hash keys on', () => {
    expect(
      toBackendsUpdateInput(values({ loadBalancer: 'LeastRequest' }), proxy()).loadBalancer
    ).toEqual({ type: 'LeastRequest' });
    expect(
      toBackendsUpdateInput(values({ loadBalancer: 'ConsistentHash' }), proxy()).loadBalancer
    ).toEqual({ type: 'ConsistentHash', consistentHash: { type: 'SourceIP' } });
    expect(
      toBackendsUpdateInput(
        values({ loadBalancer: 'ConsistentHash', hashOn: 'Header', hashHeader: ' x-user ' }),
        proxy()
      ).loadBalancer
    ).toEqual({ type: 'ConsistentHash', consistentHash: { type: 'Header', header: 'x-user' } });
  });

  it('writes passive health checks when enabled', () => {
    const input = toBackendsUpdateInput(
      values({ healthCheckEnabled: true, consecutive5xxErrors: 3, baseEjectionTime: '1m' }),
      proxy()
    );
    expect(input.healthCheck).toEqual({
      passive: { consecutive5xxErrors: 3, baseEjectionTime: '1m', maxEjectionPercent: 50 },
    });
  });
});

describe('backendsFormSchema', () => {
  it('accepts a valid form', () => {
    expect(issues(values())).toEqual({});
  });

  it('rejects a scheme typed into the origin and duplicate backends', () => {
    expect(
      issues(values({ backends: [{ ...emptyBackendRow(), endpointHost: 'https://a.com' }] }))
    ).toEqual({ 'backends.0.endpointHost': 'Leave out the http(s):// prefix' });
    expect(
      issues(
        values({
          backends: [
            { ...emptyBackendRow(), endpointHost: 'a.com' },
            { ...emptyBackendRow(), endpointHost: 'A.com' },
          ],
        })
      )
    ).toEqual({ 'backends.1.endpointHost': 'This backend is already in the list' });
  });

  it('requires a TLS hostname for an HTTPS IP origin, even with a port or path', () => {
    expect(
      issues(values({ backends: [{ ...emptyBackendRow(), endpointHost: '10.0.0.1:8443/api' }] }))
    ).toEqual({ 'backends.0.tlsHostname': 'Required when the origin is an HTTPS IP address' });
  });

  it('needs at least one backend with weight above 0', () => {
    const rows = [
      { ...emptyBackendRow(), endpointHost: 'a.com', weight: 0 },
      { ...emptyBackendRow(), endpointHost: 'b.com', weight: 0 },
    ];
    expect(Object.keys(issues(values({ backends: rows })))).toEqual(['backends.0.weight']);
  });

  it('validates the hash header and ejection time only when they apply', () => {
    expect(
      issues(values({ loadBalancer: 'ConsistentHash', hashOn: 'Header', hashHeader: 'bad name' }))
    ).toEqual({ hashHeader: 'Not a valid header name' });
    expect(issues(values({ hashOn: 'Header', hashHeader: '' }))).toEqual({});
    expect(issues(values({ healthCheckEnabled: true, baseEjectionTime: '30' }))).toEqual({
      baseEjectionTime: 'Use a duration such as 30s, 2m, or 1m30s',
    });
    expect(issues(values({ healthCheckEnabled: false, baseEjectionTime: '30' }))).toEqual({});
    expect(
      issues(values({ healthCheckEnabled: true, consecutive5xxErrors: 0, maxEjectionPercent: 101 }))
    ).toEqual({
      consecutive5xxErrors: 'Use a whole number of at least 1',
      maxEjectionPercent: 'Use a whole number from 1 to 100',
    });
  });

  it('fills in fields the form leaves out', () => {
    // What Conform hands over with one backend (weight comes from the hidden
    // input), health checks off, and empty inputs.
    const parsed = backendsFormSchema.parse({
      backends: [{ protocol: 'https', endpointHost: 'a.example.com', weight: 1 }],
      loadBalancer: 'default',
    });
    expect(parsed.backends[0]).toEqual({ ...emptyBackendRow(), endpointHost: 'a.example.com' });
    expect(parsed.healthCheckEnabled).toBe(false);
    expect(parsed.hashOn).toBe('SourceIP');
  });
});

describe('reviewer regressions', () => {
  it('keeps a TLS hostname on a non-IP origin through a save', () => {
    const current = proxy({
      backends: [{ endpoint: 'https://origin.internal', tlsHostname: 'www.example.com' }],
    });
    const form = toBackendsFormValues(current);
    expect(form.backends[0].tlsHostname).toBe('www.example.com');
    expect(toBackendsUpdateInput(form, current).backends).toEqual([
      { endpoint: 'https://origin.internal', tlsHostname: 'www.example.com' },
    ]);
  });

  it('clears stale consistent-hash fields when the algorithm changes', () => {
    const hashed = proxy({
      loadBalancer: { type: 'ConsistentHash', consistentHash: { type: 'Header', header: 'x-u' } },
    });
    expect(
      toBackendsUpdateInput(values({ loadBalancer: 'RoundRobin' }), hashed).loadBalancer
    ).toEqual({ type: 'RoundRobin', consistentHash: null });
    expect(
      toBackendsUpdateInput(values({ loadBalancer: 'ConsistentHash', hashOn: 'SourceIP' }), hashed)
        .loadBalancer
    ).toEqual({ type: 'ConsistentHash', consistentHash: { type: 'SourceIP', header: null } });
    // Nothing stale to clear.
    expect(toBackendsUpdateInput(values({ loadBalancer: 'Random' }), proxy()).loadBalancer).toEqual(
      { type: 'Random' }
    );
  });

  it('reports a cleared number instead of using a default', () => {
    const cleared = backendsFormSchema.safeParse({
      ...values(),
      backends: [{ protocol: 'https', endpointHost: 'a.com', weight: undefined }],
    });
    expect(cleared.success).toBe(false);
    expect(issues(values({ healthCheckEnabled: true, consecutive5xxErrors: undefined }))).toEqual({
      consecutive5xxErrors: 'Use a whole number of at least 1',
    });
  });

  it('requires a TLS hostname for an HTTPS IPv6 origin', () => {
    expect(
      issues(values({ backends: [{ ...emptyBackendRow(), endpointHost: '[2001:db8::1]:8443' }] }))
    ).toEqual({ 'backends.0.tlsHostname': 'Required when the origin is an HTTPS IP address' });
  });

  it('accepts both micro signs and rejects a zero ejection time', () => {
    for (const time of ['500\u00b5s', '500\u03bcs', '1m30s']) {
      expect(issues(values({ healthCheckEnabled: true, baseEjectionTime: time }))).toEqual({});
    }
    expect(issues(values({ healthCheckEnabled: true, baseEjectionTime: '0s' }))).toEqual({
      baseEjectionTime: 'Use a duration such as 30s, 2m, or 1m30s',
    });
  });
});

describe('NetworkService rows', () => {
  const service = (name: string, port: string, weight = 1) => ({
    ...emptyBackendRow('service'),
    serviceName: name,
    servicePort: port,
    weight,
  });

  it('loads and saves a NetworkService next to a URL', () => {
    const current = proxy({
      backends: [
        { networkService: { name: 'storefront', port: 'http' }, weight: 2 },
        { endpoint: 'https://a.example.com' },
      ],
    });
    const form = toBackendsFormValues(current);
    expect(form.backends).toEqual([
      service('storefront', 'http', 2),
      { ...emptyBackendRow(), endpointHost: 'a.example.com' },
    ]);
    expect(toBackendsUpdateInput(form, current).backends).toEqual([
      { networkService: { name: 'storefront', port: 'http' }, weight: 2 },
      { endpoint: 'https://a.example.com', weight: 1, tlsHostname: '' },
    ]);
  });

  it('needs a service and a port, and no URL fields', () => {
    expect(issues(values({ backends: [{ ...emptyBackendRow('service') }] }))).toEqual({
      'backends.0.serviceName': 'Choose a service',
    });
    expect(
      issues(values({ backends: [{ ...emptyBackendRow('service'), serviceName: 'storefront' }] }))
    ).toEqual({ 'backends.0.servicePort': 'Choose a port' });
    expect(issues(values({ backends: [service('storefront', 'http')] }))).toEqual({});
  });

  it('rejects the same service and port twice, but allows another port', () => {
    expect(
      issues(values({ backends: [service('storefront', 'http'), service('storefront', 'http')] }))
    ).toEqual({ 'backends.1.serviceName': 'This backend is already in the list' });
    expect(
      issues(values({ backends: [service('storefront', 'http'), service('storefront', 'admin')] }))
    ).toEqual({});
  });

  it('fills in URL fields Conform leaves out of a service row', () => {
    const parsed = backendsFormSchema.parse({
      backends: [{ kind: 'service', serviceName: 'storefront', servicePort: 'http', weight: 1 }],
      loadBalancer: 'default',
    });
    expect(parsed.backends[0]).toEqual(service('storefront', 'http'));
  });
});
