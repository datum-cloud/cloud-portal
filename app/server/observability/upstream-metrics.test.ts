import { recordUpstreamResponse, upstreamResponsesTotal } from './upstream-metrics';
import { beforeEach, describe, expect, test } from 'bun:test';

const NAMESPACED_URL = '/apis/networking.datumapis.com/v1alpha/namespaces/ns1/httpproxies/proxy1';

describe('recordUpstreamResponse', () => {
  beforeEach(() => {
    upstreamResponsesTotal.reset();
  });

  test('K8s resource URL → api_group/resource_type labels, uppercased method', async () => {
    recordUpstreamResponse({ method: 'get', url: NAMESPACED_URL, status: 404 });

    const { values } = await upstreamResponsesTotal.get();
    expect(values).toEqual([
      expect.objectContaining({
        value: 1,
        labels: {
          status: '404',
          api_group: 'networking.datumapis.com',
          resource_type: 'httpproxies',
          method: 'GET',
        },
      }),
    ]);
  });

  test('project-scoped control-plane URL → nested resource labels', async () => {
    recordUpstreamResponse({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/my-project/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones/my-zone',
      status: 200,
    });

    const { values } = await upstreamResponsesTotal.get();
    expect(values).toEqual([
      expect.objectContaining({
        value: 1,
        labels: {
          status: '200',
          api_group: 'dns.networking.miloapis.com',
          resource_type: 'dnszones',
          method: 'GET',
        },
      }),
    ]);
  });

  test('non-K8s URL → unknown api_group/resource_type', async () => {
    recordUpstreamResponse({ method: 'post', url: '/dns_setup', status: 422 });

    const { values } = await upstreamResponsesTotal.get();
    expect(values).toEqual([
      expect.objectContaining({
        value: 1,
        labels: { status: '422', api_group: 'unknown', resource_type: 'unknown', method: 'POST' },
      }),
    ]);
  });

  test('missing url and method → unknown labels and GET', async () => {
    recordUpstreamResponse({ status: 500 });

    const { values } = await upstreamResponsesTotal.get();
    expect(values).toEqual([
      expect.objectContaining({
        value: 1,
        labels: { status: '500', api_group: 'unknown', resource_type: 'unknown', method: 'GET' },
      }),
    ]);
  });

  test('repeated responses with identical labels aggregate on one series', async () => {
    recordUpstreamResponse({ method: 'get', url: NAMESPACED_URL, status: 200 });
    recordUpstreamResponse({ method: 'get', url: NAMESPACED_URL, status: 200 });

    const { values } = await upstreamResponsesTotal.get();
    expect(values).toHaveLength(1);
    expect(values[0].value).toBe(2);
  });

  test('resource names and namespaces never appear in labels', async () => {
    recordUpstreamResponse({ method: 'get', url: NAMESPACED_URL, status: 404 });

    const { values } = await upstreamResponsesTotal.get();
    const serialized = JSON.stringify(values);
    expect(serialized).not.toContain('proxy1');
    expect(serialized).not.toContain('ns1');
    expect(Object.keys(values[0].labels).sort()).toEqual([
      'api_group',
      'method',
      'resource_type',
      'status',
    ]);
  });

  test('no-op when a window global exists (client runtime)', async () => {
    (globalThis as Record<string, unknown>).window = {};
    try {
      recordUpstreamResponse({ method: 'get', url: NAMESPACED_URL, status: 200 });
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
    }

    const { values } = await upstreamResponsesTotal.get();
    expect(values).toHaveLength(0);
  });
});
