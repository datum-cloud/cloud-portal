import { toGroup, toGroupList } from './group.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toGroup', () => {
  it('maps metadata fields onto the domain Group', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'g-1',
        name: 'platform',
        namespace: 'org-acme',
        resourceVersion: '42',
        creationTimestamp: '2024-03-04T05:06:07.000Z',
      }),
    };
    expect(toGroup(raw as never)).toEqual({
      uid: 'g-1',
      name: 'platform',
      namespace: 'org-acme',
      resourceVersion: '42',
      createdAt: '2024-03-04T05:06:07.000Z',
    });
  });

  it('defaults every field to empty string when metadata is absent', () => {
    expect(toGroup({} as never)).toEqual({
      uid: '',
      name: '',
      namespace: '',
      resourceVersion: '',
      createdAt: '',
    });
  });
});

describe('toGroupList', () => {
  it('maps each item and reports hasMore=true when a cursor is given', () => {
    const items = [
      { metadata: { uid: 'a', name: 'one' } },
      { metadata: { uid: 'b', name: 'two' } },
    ];
    const list = toGroupList(items as never, 'next-token');

    expect(list.items.map((g) => g.uid)).toEqual(['a', 'b']);
    expect(list.nextCursor).toBe('next-token');
    expect(list.hasMore).toBe(true);
  });

  it('reports no more pages and a null cursor when no token is given', () => {
    const list = toGroupList([] as never);
    expect(list.items).toEqual([]);
    expect(list.nextCursor).toBeNull();
    expect(list.hasMore).toBe(false);
  });
});
