import { toAllowanceBucket, toAllowanceBucketList } from './allowance-bucket.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toAllowanceBucket', () => {
  it('maps metadata + resourceType and normalizes createdAt to an ISO string', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'ab-1', name: 'cpu-bucket', namespace: 'proj-1' }),
      spec: { resourceType: 'cpu' },
      status: { allocated: 4 },
    };
    const bucket = toAllowanceBucket(raw as never);

    expect(bucket.uid).toBe('ab-1');
    expect(bucket.name).toBe('cpu-bucket');
    expect(bucket.resourceType).toBe('cpu');
    expect(bucket.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(bucket.status).toEqual({ allocated: 4 });
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
