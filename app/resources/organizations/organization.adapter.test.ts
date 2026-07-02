import {
  toCreatePayload,
  toOrganization,
  toOrganizationFromMembership,
  toOrganizationList,
  toUpdatePayload,
} from './organization.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toOrganization', () => {
  it('maps display-name annotation and resolves Active status from a Ready condition', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'o-1',
        name: 'acme',
        annotations: {
          'kubernetes.io/display-name': 'Acme Inc',
          'kubernetes.io/description': 'The Acme org',
        },
      }),
      spec: { type: 'Standard' },
      status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready' }] },
    };
    const org = toOrganization(raw as never);

    expect(org.displayName).toBe('Acme Inc');
    expect(org.description).toBe('The Acme org');
    expect(org.type).toBe('Standard');
    expect(org.status).toBe('Active');
  });

  it('falls back to Pending when there are no conditions, and name for displayName', () => {
    const raw = { metadata: rawMetadata({ name: 'no-status' }), spec: {} };
    const org = toOrganization(raw as never);
    expect(org.status).toBe('Pending');
    expect(org.displayName).toBe('no-status');
    expect(org.type).toBeUndefined();
  });

  it('maps a Suspended reason to Suspended status', () => {
    const raw = {
      metadata: rawMetadata({ name: 'acme' }),
      spec: { type: 'Standard' },
      status: { conditions: [{ type: 'Ready', status: 'False', reason: 'Suspended' }] },
    };
    expect(toOrganization(raw as never).status).toBe('Suspended');
  });

  it('maps a Deleting reason to Deleting status', () => {
    const raw = {
      metadata: rawMetadata({ name: 'acme' }),
      spec: { type: 'Standard' },
      status: { conditions: [{ type: 'Ready', status: 'False', reason: 'Deleting' }] },
    };
    expect(toOrganization(raw as never).status).toBe('Deleting');
  });

  it('falls back to Pending for an unknown not-ready reason', () => {
    const raw = {
      metadata: rawMetadata({ name: 'acme' }),
      spec: { type: 'Standard' },
      status: { conditions: [{ type: 'Ready', status: 'False', reason: 'SomethingElse' }] },
    };
    expect(toOrganization(raw as never).status).toBe('Pending');
  });

  it('returns Pending when conditions exist but none is Ready', () => {
    const raw = {
      metadata: rawMetadata({ name: 'acme' }),
      spec: { type: 'Standard' },
      status: { conditions: [{ type: 'Other', status: 'True', reason: 'x' }] },
    };
    expect(toOrganization(raw as never).status).toBe('Pending');
  });
});

describe('toOrganizationList', () => {
  it('maps items and reads the pagination cursor from metadata.continue', () => {
    const raw = {
      items: [
        { metadata: rawMetadata({ name: 'a' }), spec: {}, status: {} },
        { metadata: rawMetadata({ name: 'b' }), spec: {}, status: {} },
      ],
      metadata: { continue: 'tok' },
    };
    const list = toOrganizationList(raw as never);
    expect(list.items.map((o) => o.name)).toEqual(['a', 'b']);
    expect(list.nextCursor).toBe('tok');
    expect(list.hasMore).toBe(true);
  });
});

describe('toOrganizationFromMembership', () => {
  it('derives the org from the membership ref and status detail', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'mem-1' }),
      spec: { organizationRef: { name: 'acme' } },
      status: { organization: { displayName: 'Acme Inc', type: 'Personal' } },
    };
    const org = toOrganizationFromMembership(raw as never);
    expect(org.name).toBe('acme');
    expect(org.displayName).toBe('Acme Inc');
    expect(org.type).toBe('Personal');
  });
});

describe('toCreatePayload', () => {
  it('always stamps display-name and includes description only when present', () => {
    const withDesc = toCreatePayload({
      name: 'acme',
      displayName: 'Acme Inc',
      description: 'desc',
      type: 'Standard',
    } as never);
    expect(withDesc.metadata?.annotations).toEqual({
      'kubernetes.io/display-name': 'Acme Inc',
      'kubernetes.io/description': 'desc',
    });
    expect(withDesc.spec?.type).toBe('Standard');

    const noDesc = toCreatePayload({
      name: 'acme',
      displayName: 'Acme Inc',
      type: 'Standard',
    } as never);
    expect(noDesc.metadata?.annotations).toEqual({ 'kubernetes.io/display-name': 'Acme Inc' });
  });
});

describe('toUpdatePayload', () => {
  it('emits JSON Patch replace ops with escaped annotation paths', () => {
    expect(toUpdatePayload({ displayName: 'New Name', description: 'New desc' } as never)).toEqual([
      {
        op: 'replace',
        path: '/metadata/annotations/kubernetes.io~1display-name',
        value: 'New Name',
      },
      {
        op: 'replace',
        path: '/metadata/annotations/kubernetes.io~1description',
        value: 'New desc',
      },
    ]);
  });

  it('emits no ops when nothing is provided', () => {
    expect(toUpdatePayload({} as never)).toEqual([]);
  });
});
