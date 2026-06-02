import {
  toCreateInvitationPayload,
  toInvitation,
  toInvitationList,
  toUpdateInvitationStatePayload,
} from './invitation.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toInvitation', () => {
  it('maps spec/status, taking the first role and defaulting role namespace + state', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'i-1', name: 'inv-1' }),
      spec: {
        email: 'invitee@acme.com',
        invitedBy: { name: 'admin' },
        organizationRef: { name: 'acme' },
        roles: [{ name: 'viewer' }],
      },
      status: {
        inviterUser: { displayName: 'Admin User', emailAddress: 'admin@acme.com' },
        organization: { displayName: 'Acme Inc' },
      },
    };
    const inv = toInvitation(raw as never);

    expect(inv.email).toBe('invitee@acme.com');
    expect(inv.invitedBy).toBe('admin');
    expect(inv.organizationName).toBe('acme');
    expect(inv.role).toBe('viewer');
    expect(inv.roleNamespace).toBe('milo-system');
    expect(inv.state).toBe('Pending');
    expect(inv.inviterUser).toEqual({ displayName: 'Admin User' });
    expect(inv.organization).toEqual({ displayName: 'Acme Inc' });
  });

  it('falls back to email for inviter displayName and undefined when neither is present', () => {
    const onlyEmail = toInvitation({
      metadata: { name: 'x' },
      spec: { email: 'e@x.com' },
      status: { inviterUser: { emailAddress: '  admin@acme.com  ' } },
    } as never);
    expect(onlyEmail.inviterUser).toEqual({ displayName: 'admin@acme.com' });
    expect(onlyEmail.organization).toBeUndefined();

    const neither = toInvitation({
      metadata: { name: 'y' },
      spec: { email: 'e@x.com' },
      status: { inviterUser: { displayName: '   ' } },
    } as never);
    expect(neither.inviterUser).toBeUndefined();
  });
});

describe('toInvitationList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toInvitationList(
      [{ metadata: { uid: 'a' }, spec: { email: 'a@x.com' } }] as never,
      't'
    );
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
  });
});

describe('toCreateInvitationPayload', () => {
  it('builds a UserInvitation with an org-prefixed name and 24h RFC3339 expiry', () => {
    const payload = toCreateInvitationPayload('acme', {
      email: 'invitee@acme.com',
      role: 'viewer',
    } as never);

    expect(payload.kind).toBe('UserInvitation');
    expect(payload.metadata.name).toMatch(/^acme-/);
    expect(payload.spec.email).toBe('invitee@acme.com');
    expect(payload.spec.organizationRef).toEqual({ name: 'acme' });
    expect(payload.spec.roles).toEqual([{ name: 'viewer', namespace: 'milo-system' }]);
    expect(payload.spec.state).toBe('Pending');
    // RFC3339 expiry stamped from now+24h.
    expect(payload.spec.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('emits an empty roles array when no role is given', () => {
    const payload = toCreateInvitationPayload('acme', { email: 'e@x.com' } as never);
    expect(payload.spec.roles).toEqual([]);
  });
});

describe('toUpdateInvitationStatePayload', () => {
  it('wraps the new state in a UserInvitation patch', () => {
    expect(toUpdateInvitationStatePayload('Accepted')).toEqual({
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'UserInvitation',
      spec: { state: 'Accepted' },
    });
  });
});
