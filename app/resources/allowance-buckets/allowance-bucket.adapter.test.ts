import { toAllowanceBucket, toAllowanceBucketList } from './allowance-bucket.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it, test } from 'bun:test';

describe('toAllowanceBucket', () => {
  it('maps metadata + resourceType and normalizes createdAt to an ISO string', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'ab-1', name: 'cpu-bucket', namespace: 'proj-1' }),
      spec: { resourceType: 'cpu' },
      status: { limit: 10, allocated: 4, available: 6 },
    };
    const bucket = toAllowanceBucket(raw as never);

    expect(bucket.uid).toBe('ab-1');
    expect(bucket.name).toBe('cpu-bucket');
    expect(bucket.resourceType).toBe('cpu');
    expect(bucket.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(bucket.status).toEqual({ limit: 10, allocated: 4, available: 6 });
  });

  it('leaves createdAt undefined when no creationTimestamp is present', () => {
    const bucket = toAllowanceBucket({ metadata: {}, spec: { resourceType: 'memory' } } as never);
    expect(bucket.createdAt).toBeUndefined();
    expect(bucket.resourceType).toBe('memory');
  });
});

describe('toAllowanceBucketList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toAllowanceBucketList(
      [{ metadata: rawMetadata({ uid: 'a' }), spec: { resourceType: 'cpu' } }] as never,
      'tok'
    );
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('tok');
    expect(list.hasMore).toBe(true);
  });
});

const base = {
  metadata: { uid: 'u1', name: 'bucket-abc', namespace: 'milo-system' },
  spec: {
    consumerRef: { kind: 'Project', name: 'p1' },
    resourceType: 'dns.networking.miloapis.com/dnszones',
  },
};

describe('toAllowanceBucket status typing', () => {
  test('parses numeric status', () => {
    const b = toAllowanceBucket({
      ...base,
      status: { limit: 25, allocated: 25, available: 0, claimCount: 25, grantCount: 1 },
    } as never);
    expect(b.status).toEqual({
      limit: 25,
      allocated: 25,
      available: 0,
      claimCount: 25,
      grantCount: 1,
    });
  });
  test('coerces bigint and string values to number', () => {
    const b = toAllowanceBucket({
      ...base,
      status: { limit: 25n, allocated: '10', available: 15n },
    } as never);
    expect(b.status?.available).toBe(15);
    expect(b.status?.allocated).toBe(10);
  });
  test('missing status stays undefined', () => {
    expect(toAllowanceBucket(base as never).status).toBeUndefined();
  });
  test('malformed status degrades to undefined instead of throwing', () => {
    expect(toAllowanceBucket({ ...base, status: { limit: 'x' } } as never).status).toBeUndefined();
  });
  test('null numeric fields degrade to undefined (fail-open), not zero', () => {
    expect(
      toAllowanceBucket({
        ...base,
        status: { limit: null, allocated: null, available: null },
      } as never).status
    ).toBeUndefined();
  });
});
