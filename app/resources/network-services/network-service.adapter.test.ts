import { toNetworkService, toNetworkServiceList } from './network-service.adapter';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

function condition(type: string, status: 'True' | 'False', reason = '', message = '') {
  return { type, status, reason, message, lastTransitionTime: '2026-09-16T00:00:00Z' };
}

function raw(
  overrides: Partial<ComDatumapisNetworkingV1AlphaNetworkService> = {}
): ComDatumapisNetworkingV1AlphaNetworkService {
  return {
    metadata: { name: 'checkout', uid: 'u1', resourceVersion: '7' },
    spec: {
      networkInterfaces: { selector: { matchLabels: { app: 'checkout' } } },
      ports: [
        { name: 'http', port: 8080, protocol: 'TCP' },
        { name: 'grpc', port: 9090, protocol: 'TCP' },
      ],
    },
    ...overrides,
  } as ComDatumapisNetworkingV1AlphaNetworkService;
}

describe('toNetworkService', () => {
  it('reads identity and declared ports in order', () => {
    const svc = toNetworkService(raw());

    expect(svc).toMatchObject({ uid: 'u1', name: 'checkout', resourceVersion: '7' });
    expect(svc.ports).toEqual([
      { name: 'http', port: 8080, protocol: 'TCP' },
      { name: 'grpc', port: 9090, protocol: 'TCP' },
    ]);
  });

  it('is not ready when the resource carries no conditions yet', () => {
    const svc = toNetworkService(raw());
    expect(svc.ready).toBe(false);
    expect(svc.membersResolved).toBe(false);
  });

  it('reads Ready and MembersResolved', () => {
    const svc = toNetworkService(
      raw({
        status: { conditions: [condition('Ready', 'True'), condition('MembersResolved', 'True')] },
      })
    );
    expect(svc.ready).toBe(true);
    expect(svc.membersResolved).toBe(true);
    expect(svc.notReadyReason).toBeUndefined();
  });

  it('prefers the unresolved selector as the explanation over a bare not-ready', () => {
    // A service written before its workload exists is the ordinary case, and
    // "selector matched nothing" says far more than "not ready".
    const svc = toNetworkService(
      raw({
        status: {
          conditions: [
            condition('Ready', 'False', 'NotReady', 'not ready'),
            condition(
              'MembersResolved',
              'False',
              'NoMatchingInterfaces',
              'selector matched no network interface'
            ),
          ],
        },
      })
    );

    expect(svc.ready).toBe(false);
    expect(svc.notReadyReason).toBe('NoMatchingInterfaces');
    expect(svc.notReadyMessage).toBe('selector matched no network interface');
  });

  it('falls back to the Ready reason when membership did resolve', () => {
    const svc = toNetworkService(
      raw({
        status: {
          conditions: [
            condition('Ready', 'False', 'NoServingLocations', 'every location is out of rotation'),
            condition('MembersResolved', 'True'),
          ],
        },
      })
    );

    expect(svc.membersResolved).toBe(true);
    expect(svc.notReadyReason).toBe('NoServingLocations');
  });

  it('carries the membership summary when present', () => {
    const svc = toNetworkService(
      raw({ status: { summary: { members: 4, healthy: 3, locations: 2 } } })
    );
    expect(svc.summary).toEqual({ members: 4, healthy: 3, locations: 2 });
  });

  it('tolerates a service with no ports declared', () => {
    const svc = toNetworkService({
      metadata: { name: 'empty' },
      spec: { networkInterfaces: { selector: {} } },
    } as ComDatumapisNetworkingV1AlphaNetworkService);
    expect(svc.ports).toEqual([]);
  });
});

describe('toNetworkServiceList', () => {
  it('maps items and reports no more pages without a cursor', () => {
    const list = toNetworkServiceList([raw()]);
    expect(list.items).toHaveLength(1);
    expect(list.hasMore).toBe(false);
    expect(list.nextCursor).toBeNull();
  });

  it('reports more pages when given a cursor', () => {
    const list = toNetworkServiceList([raw()], 'next-token');
    expect(list.hasMore).toBe(true);
    expect(list.nextCursor).toBe('next-token');
  });
});
