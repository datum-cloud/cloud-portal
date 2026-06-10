import {
  toMember,
  toMemberList,
  toUpdateMemberRolePayload,
  toUpdateMemberRolesPayload,
} from './member.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toMember', () => {
  it('resolves user/org from refs and merges status detail', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'm-1', name: 'membership-1', resourceVersion: '3' }),
      spec: {
        userRef: { name: 'user-abc' },
        organizationRef: { name: 'org-acme' },
        roles: [{ name: 'admin', namespace: 'milo-system' }],
      },
      status: {
        user: { email: 'a@b.com', givenName: 'Ada' },
        organization: { displayName: 'Acme' },
      },
    };
    const member = toMember(raw as never);

    expect(member.uid).toBe('m-1');
    expect(member.user).toEqual({ id: 'user-abc', email: 'a@b.com', givenName: 'Ada' });
    expect(member.organization).toEqual({ id: 'org-acme', displayName: 'Acme' });
    expect(member.roles).toEqual([{ name: 'admin', namespace: 'milo-system' }]);
  });

  it('defaults ids to empty strings and roles to an empty array', () => {
    const member = toMember({ metadata: { name: 'x' } } as never);
    expect(member.user.id).toBe('');
    expect(member.organization.id).toBe('');
    expect(member.roles).toEqual([]);
  });
});

describe('toMemberList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toMemberList([{ metadata: { uid: 'a' }, spec: {} }] as never, 'tok');
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
    expect(list.nextCursor).toBe('tok');
  });
});

describe('toUpdateMemberRolesPayload', () => {
  it('replaces the full roles array on an OrganizationMembership patch', () => {
    const roles = [
      { name: 'viewer', namespace: 'milo-system' },
      { name: 'editor', namespace: 'milo-system' },
    ];
    expect(toUpdateMemberRolesPayload('member-1', roles)).toEqual({
      apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
      kind: 'OrganizationMembership',
      metadata: { name: 'member-1' },
      spec: { roles },
    });
  });
});

describe('toUpdateMemberRolePayload', () => {
  it('wraps a single role and defaults the namespace to milo-system', () => {
    expect(toUpdateMemberRolePayload('member-1', { role: 'admin' } as never).spec.roles).toEqual([
      { name: 'admin', namespace: 'milo-system' },
    ]);
  });

  it('honors an explicit role namespace', () => {
    const payload = toUpdateMemberRolePayload('member-1', {
      role: 'admin',
      roleNamespace: 'custom-ns',
    } as never);
    expect(payload.spec.roles[0].namespace).toBe('custom-ns');
  });
});
