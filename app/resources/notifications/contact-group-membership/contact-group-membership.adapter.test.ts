import {
  toContactGroupMembership,
  toContactGroupMembershipList,
  toCreateContactGroupMembershipPayload,
} from './contact-group-membership.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toContactGroupMembership', () => {
  it('maps refs and builds a "contact → group" displayName', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'm-1', name: 'membership-1' }),
      spec: { contactGroupRef: { name: 'oncall' }, contactRef: { name: 'ada' } },
      status: { username: 'ada@acme.com' },
    };
    const membership = toContactGroupMembership(raw as never);

    expect(membership.contactGroupName).toBe('oncall');
    expect(membership.contactName).toBe('ada');
    expect(membership.displayName).toBe('ada → oncall');
    expect(membership.username).toBe('ada@acme.com');
  });

  it('defaults refs to empty strings when spec is absent', () => {
    const membership = toContactGroupMembership({ metadata: { name: 'x' } } as never);
    expect(membership.contactGroupName).toBe('');
    expect(membership.contactName).toBe('');
    expect(membership.displayName).toBe(' → ');
  });
});

describe('toContactGroupMembershipList', () => {
  it('reads the cursor from metadata.continue', () => {
    const list = toContactGroupMembershipList({
      items: [{ metadata: { uid: 'a' }, spec: {} }],
      metadata: { continue: 'c' },
    } as never);
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('c');
  });
});

describe('toCreateContactGroupMembershipPayload', () => {
  it('builds refs with the supplied namespaces', () => {
    const payload = toCreateContactGroupMembershipPayload(
      { name: 'membership-1', contactGroupName: 'oncall', contactName: 'ada' } as never,
      'group-ns',
      'contact-ns'
    );
    expect(payload.kind).toBe('ContactGroupMembership');
    expect(payload.spec?.contactGroupRef).toEqual({ name: 'oncall', namespace: 'group-ns' });
    expect(payload.spec?.contactRef).toEqual({ name: 'ada', namespace: 'contact-ns' });
  });
});
