import {
  toContactGroupMembershipRemoval,
  toContactGroupMembershipRemovalList,
  toCreateContactGroupMembershipRemovalPayload,
} from './contact-group-membership-removal.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toContactGroupMembershipRemoval', () => {
  it('maps refs and builds a "contact ⟂ group" displayName', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'r-1', name: 'removal-1' }),
      spec: { contactGroupRef: { name: 'oncall' }, contactRef: { name: 'ada' } },
      status: { username: 'ada@acme.com' },
    };
    const removal = toContactGroupMembershipRemoval(raw as never);

    expect(removal.contactGroupName).toBe('oncall');
    expect(removal.contactName).toBe('ada');
    expect(removal.displayName).toBe('ada ⟂ oncall');
    expect(removal.username).toBe('ada@acme.com');
  });

  it('defaults refs to empty strings when spec is absent', () => {
    const removal = toContactGroupMembershipRemoval({ metadata: { name: 'x' } } as never);
    expect(removal.contactGroupName).toBe('');
    expect(removal.contactName).toBe('');
  });
});

describe('toContactGroupMembershipRemovalList', () => {
  it('reads the cursor from metadata.continue', () => {
    const list = toContactGroupMembershipRemovalList({
      items: [{ metadata: { uid: 'a' }, spec: {} }],
      metadata: { continue: 'c' },
    } as never);
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('c');
  });
});

describe('toCreateContactGroupMembershipRemovalPayload', () => {
  it('builds refs with the supplied namespaces', () => {
    const payload = toCreateContactGroupMembershipRemovalPayload(
      { name: 'removal-1', contactGroupName: 'oncall', contactName: 'ada' } as never,
      'group-ns',
      'contact-ns'
    );
    expect(payload.kind).toBe('ContactGroupMembershipRemoval');
    expect(payload.spec?.contactGroupRef).toEqual({ name: 'oncall', namespace: 'group-ns' });
    expect(payload.spec?.contactRef).toEqual({ name: 'ada', namespace: 'contact-ns' });
  });
});
