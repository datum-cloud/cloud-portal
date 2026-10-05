import {
  addBackendBlockReason,
  algorithmLabel,
  formatDuration,
  formatShare,
  GATEWAY_DURATION_PATTERN,
  hostOverrideConflict,
  poolLockReason,
  poolWith,
  shareLabels,
  suggestedWeight,
  toBackendRows,
  weightShares,
} from './backend-pool';
import { toHttpProxyBackend, type HttpProxy } from '@/resources/http-proxies';
import { describe, expect, it } from 'bun:test';

const blue = toHttpProxyBackend({ endpoint: 'https://blue.fly.dev', weight: 95 });
const green = toHttpProxyBackend({ endpoint: 'https://green.fly.dev', weight: 5 });

function proxy(overrides: Partial<HttpProxy>): HttpProxy {
  return {
    uid: 'u',
    name: 'alb',
    resourceVersion: '1',
    createdAt: new Date(0),
    ...overrides,
  };
}

describe('weightShares', () => {
  it('splits by weight', () => {
    expect(weightShares([95, 5])).toEqual([95, 5]);
    expect(weightShares([1, 1, 2])).toEqual([25, 25, 50]);
  });

  it('gives every backend 0% when nothing is weighted', () => {
    expect(weightShares([0, 0])).toEqual([0, 0]);
  });
});

describe('formatShare', () => {
  it('flags slivers instead of rounding them to 0%', () => {
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(0.4)).toBe('<1%');
    expect(formatShare(33.3)).toBe('33%');
  });
});

describe('toBackendRows', () => {
  it('describes endpoints, compute and drained backends', () => {
    const rows = toBackendRows([
      blue,
      toHttpProxyBackend({ networkService: { name: 'web', port: 'http' }, weight: 0 }),
    ]);
    expect(rows[0]).toMatchObject({ title: 'blue.fly.dev', scheme: 'https', share: 100 });
    expect(rows[1]).toMatchObject({ title: 'web', kindLabel: 'Workload', drained: true, share: 0 });
  });

  it('names a workload backend by its workload and says what runs behind it', () => {
    const rows = toBackendRows(
      [toHttpProxyBackend({ networkService: { name: 'tester-svc', port: 'http' } })],
      {
        services: new Map([
          [
            'tester-svc',
            {
              workloadName: 'alb-lb-tester',
              healthy: 2,
              members: 3,
              locations: ['us-central-1'],
              ports: { http: 3000 },
              href: '/project/p/services/workloads/alb-lb-tester',
            },
          ],
        ]),
      }
    );
    expect(rows[0]).toMatchObject({
      title: 'alb-lb-tester',
      address: '2/3 instances healthy · us-central-1 · port 3000',
      kindLabel: 'Workload',
      href: '/project/p/services/workloads/alb-lb-tester',
      privateNetwork: true,
    });
  });

  it('marks only the managing workload’s own backend as workload-owned', () => {
    const rows = toBackendRows(
      [
        toHttpProxyBackend({ networkService: { name: 'api', port: 'http' } }),
        toHttpProxyBackend({ networkService: { name: 'worker', port: 'http' } }),
        blue,
      ],
      { managingWorkload: 'api' }
    );
    expect(rows.map((row) => row.workloadOwned)).toEqual([true, false, false]);
  });

  it('marks nothing workload-owned when no workload manages the proxy', () => {
    const rows = toBackendRows([
      toHttpProxyBackend({ networkService: { name: 'api', port: 'http' } }),
    ]);
    expect(rows[0].workloadOwned).toBe(false);
  });

  it('flags a deleted workload and drops the link to its page', () => {
    const service = (workloadName: string) => ({
      workloadName,
      locations: [],
      ports: {},
      href: `/project/p/services/workloads/${workloadName}`,
    });
    const rows = toBackendRows(
      [
        toHttpProxyBackend({ networkService: { name: 'a-svc', port: 'http' } }),
        toHttpProxyBackend({ networkService: { name: 'b-svc', port: 'http' } }),
        blue,
      ],
      {
        services: new Map([
          ['a-svc', service('tester-a')],
          ['b-svc', service('tester-b')],
        ]),
        missingWorkloads: new Set(['tester-b']),
      }
    );
    expect(rows.map((row) => row.workloadMissing)).toEqual([false, true, false]);
    expect(rows.map((row) => row.href)).toEqual([
      '/project/p/services/workloads/tester-a',
      undefined,
      undefined,
    ]);
  });

  it('falls back to the port name when the service is unknown', () => {
    const rows = toBackendRows([
      toHttpProxyBackend({ networkService: { name: 'gone', port: 'http' } }),
    ]);
    expect(rows[0]).toMatchObject({ title: 'gone', address: 'port http' });
  });
});

describe('poolWith', () => {
  it('passes untouched backends through by raw entry', () => {
    const next = poolWith([blue, green], { type: 'remove', index: 0 });
    expect(next).toEqual([{ raw: green.raw }]);
  });

  it('replaces one backend in place', () => {
    const next = poolWith([blue, green], {
      type: 'replace',
      index: 1,
      backend: { endpoint: 'https://green.fly.dev', weight: 50 },
    });
    expect(next[1]).toEqual({ endpoint: 'https://green.fly.dev', weight: 50 });
  });
});

describe('addBackendBlockReason', () => {
  it('blocks adding next to a connector', () => {
    const connector = toHttpProxyBackend({
      endpoint: 'http://localhost',
      connector: { name: 'c' },
    });
    expect(addBackendBlockReason(proxy({ backends: [connector] }))).toContain('connector');
    expect(addBackendBlockReason(proxy({ backends: [blue] }))).toBeUndefined();
  });
});

describe('hostOverrideConflict', () => {
  it('flags a Host override across origins on different hostnames', () => {
    expect(hostOverrideConflict(proxy({ hostHeader: 'x.com', backends: [blue, green] }))).toBe(
      true
    );
    expect(hostOverrideConflict(proxy({ hostHeader: 'x.com', backends: [blue] }))).toBe(false);
    expect(hostOverrideConflict(proxy({ backends: [blue, green] }))).toBe(false);
  });
});

describe('algorithmLabel', () => {
  it('names the hash key for consistent hashing', () => {
    // Unset falls back to the data plane's least-request default.
    expect(algorithmLabel(undefined)).toBe('Least request');
    expect(algorithmLabel({ type: 'LeastRequest' })).toBe('Least request');
    expect(
      algorithmLabel({ type: 'ConsistentHash', consistentHash: { type: 'Header', header: 'x-u' } })
    ).toBe('Consistent hash · x-u');
  });
});

describe('durations', () => {
  it('formats simple durations and validates Gateway API syntax', () => {
    expect(formatDuration('30s')).toBe('30 seconds');
    expect(formatDuration('1m')).toBe('1 minute');
    expect(formatDuration('1m30s')).toBe('1m30s');
    expect(GATEWAY_DURATION_PATTERN.test('1m30s')).toBe(true);
    expect(GATEWAY_DURATION_PATTERN.test('30')).toBe(false);
  });
});

describe('suggestedWeight', () => {
  it('starts a new backend at the pool average, ignoring drained ones', () => {
    const drained = toHttpProxyBackend({ endpoint: 'https://old.fly.dev', weight: 0 });
    expect(suggestedWeight([blue, green, drained])).toBe(50);
    expect(suggestedWeight([])).toBe(1);
    expect(suggestedWeight([drained])).toBe(1);
  });
});

describe('shareLabels', () => {
  it('rounds the pool together so the labels total 100%', () => {
    expect(shareLabels([37.5, 62.5])).toEqual(['38%', '62%']);
    expect(shareLabels([100 / 3, 100 / 3, 100 / 3])).toEqual(['34%', '33%', '33%']);
  });

  it('keeps slivers visible and drained backends at 0%', () => {
    expect(shareLabels([99.6, 0.4, 0])).toEqual(['100%', '<1%', '0%']);
    expect(shareLabels([0, 0])).toEqual(['0%', '0%']);
  });
});

describe('poolLockReason', () => {
  it('leaves a workload-published pool editable', () => {
    expect(poolLockReason(proxy({ workloadName: 'api' }))).toBeUndefined();
  });

  it('locks a proxy with rules the portal can’t rebuild', () => {
    expect(poolLockReason(proxy({ complexity: 'advanced' }))).toContain('datumctl or kubectl');
  });
});
