import { toCreateHttpProxyPayload } from './http-proxy.adapter';
import { httpProxySchema } from './http-proxy.schema';
import { describe, expect, it } from 'bun:test';

function backendRule(payload: ReturnType<typeof toCreateHttpProxyPayload>) {
  const rule = payload.spec.rules.find((r) => 'backends' in r);
  return rule && 'backends' in rule ? rule.backends : undefined;
}

describe('toCreateHttpProxyPayload', () => {
  it('points the first backend at a public origin', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'alb',
      endpoint: 'https://203.0.113.1',
      tlsHostname: 'api.example.com',
    });
    expect(backendRule(payload)).toEqual([
      { endpoint: 'https://203.0.113.1', tls: { hostname: 'api.example.com' } },
    ]);
  });

  it('points the first backend at a workload’s service, without TLS', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'alb',
      networkService: { name: 'storefront', port: 'http' },
      tlsHostname: 'ignored.example.com',
    });
    expect(backendRule(payload)).toEqual([
      { networkService: { name: 'storefront', port: 'http' } },
    ]);
  });
});

describe('httpProxySchema origin', () => {
  const base = { chosenName: 'Storefront', name: 'storefront-abc123' };

  it('requires an origin for a public backend', () => {
    const result = httpProxySchema.safeParse({ ...base, originType: 'endpoint' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('endpointHost');
  });

  it('needs a workload and port, not an origin, for a compute backend', () => {
    const missingPort = httpProxySchema.safeParse({
      ...base,
      originType: 'networkService',
      serviceName: 'storefront',
    });
    expect(missingPort.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['servicePort']);

    const complete = httpProxySchema.safeParse({
      ...base,
      originType: 'networkService',
      serviceName: 'storefront',
      servicePort: 'http',
    });
    expect(complete.success).toBe(true);
  });
});
