import { toGroupMembership, toGroupMembershipList } from './group-membership.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toGroupMembership', () => {
  it('maps group and user refs', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'gm-1', name: 'membership-1' }),
      spec: {
        groupRef: { name: 'platform', namespace: 'org-acme' },
        userRef: { name: 'user-a' },
      },
    };
    const gm = toGroupMembership(raw as never);

    expect(gm.uid).toBe('gm-1');
    expect(gm.groupRef).toEqual({ name: 'platform', namespace: 'org-acme' });
    expect(gm.userRef).toEqual({ name: 'user-a' });
  });

  it('defaults ref fields to empty strings when spec is absent', () => {
    const gm = toGroupMembership({ metadata: { name: 'x' } } as never);
    expect(gm.groupRef).toEqual({ name: '', namespace: '' });
    expect(gm.userRef).toEqual({ name: '' });
    expect(gm.createdAt).toBe('');
  });
});

describe('toGroupMembershipList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toGroupMembershipList(
      [{ metadata: rawMetadata({ uid: 'a' }), spec: { groupRef: {}, userRef: {} } }] as never,
      'tok'
    );
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
  });
});
