import { listOriginDisplay, summarizeBackends } from './backend-summary';
import { COMPUTE_WORKLOAD_NAME_LABEL } from './compute-backend';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import type { HttpProxy } from '@/resources/http-proxies';
import { describe, expect, it } from 'bun:test';

function proxy(overrides: Partial<HttpProxy> = {}): HttpProxy {
  return {
    uid: 'u',
    name: 'alb',
    resourceVersion: '1',
    createdAt: new Date(0),
    ...overrides,
  };
}

describe('summarizeBackends', () => {
  it('names a single endpoint origin', () => {
    expect(summarizeBackends(proxy({ endpoint: 'https://origin.example.com' }))).toEqual({
      count: 1,
      label: 'https://origin.example.com',
    });
  });

  it('prefers a labelled compute workload over an opaque networkService', () => {
    expect(
      summarizeBackends(
        proxy({
          networkService: { name: 'storefront', port: 'http' },
          workloadName: 'storefront',
        })
      )
    ).toEqual({
      count: 1,
      label: 'storefront',
      workloadName: 'storefront',
      networkServiceName: 'storefront',
    });
  });

  it('surfaces a networkService backend when the workload label is missing', () => {
    expect(summarizeBackends(proxy({ networkService: { name: 'api', port: 'http' } }))).toEqual({
      count: 1,
      label: 'Compute · api',
      networkServiceName: 'api',
    });
  });
});

describe('listOriginDisplay', () => {
  it('shows an em dash when no backend is configured', () => {
    expect(listOriginDisplay(proxy())).toEqual({ text: '—', empty: true });
  });

  it('shows the endpoint URL for classic origins', () => {
    expect(listOriginDisplay(proxy({ endpoint: 'https://origin.example.com' }))).toEqual({
      text: 'https://origin.example.com',
      empty: false,
    });
  });

  it('links a labelled compute workload without fetching NetworkServices', () => {
    expect(
      listOriginDisplay(
        proxy({
          networkService: { name: 'storefront', port: 'http' },
          workloadName: 'storefront',
        })
      )
    ).toEqual({
      text: 'storefront',
      workloadName: 'storefront',
      empty: false,
    });
  });

  it('resolves the workload from a NetworkService map when the proxy is unlabeled', () => {
    const services = new Map<string, ComDatumapisNetworkingV1AlphaNetworkService>([
      [
        'api',
        {
          metadata: {
            name: 'api',
            labels: { [COMPUTE_WORKLOAD_NAME_LABEL]: 'checkout' },
          },
          spec: {
            networkInterfaces: {
              selector: {
                matchLabels: { [COMPUTE_WORKLOAD_NAME_LABEL]: 'checkout' },
              },
            },
            ports: [{ name: 'http', port: 80 }],
          },
        },
      ],
    ]);
    expect(
      listOriginDisplay(proxy({ networkService: { name: 'api', port: 'http' } }), services)
    ).toEqual({
      text: 'checkout',
      workloadName: 'checkout',
      empty: false,
    });
  });

  it('falls back to the NetworkService name until the map is available', () => {
    expect(listOriginDisplay(proxy({ networkService: { name: 'api', port: 'http' } }))).toEqual({
      text: 'Compute · api',
      empty: false,
    });
  });
});
