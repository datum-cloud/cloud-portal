import {
  describeLinkFailure,
  getPrivateZoneState,
  getPrivateZoneVpcLinks,
  NETWORK_LABEL,
  NETWORK_UID_LABEL,
  toDnsResolverContext,
  toDnsZoneAssociation,
} from './private-dns.adapter';
import type { DnsResolverContext, DnsZoneAssociation } from './private-dns.schema';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'vitest';

function association(overrides: Partial<DnsZoneAssociation> = {}): DnsZoneAssociation {
  return {
    name: 'prod-web',
    zoneName: 'prod',
    contextName: 'ctx-web',
    accepted: { status: 'True', reason: 'Accepted' },
    deleting: false,
    ...overrides,
  };
}

function context(overrides: Partial<DnsResolverContext> = {}): DnsResolverContext {
  return { name: 'ctx-web', networkName: 'web', deleting: false, ...overrides };
}

const programmed = (status: string, reason: string) => ({
  status: { conditions: [{ type: 'Programmed', status, reason }] },
});

describe('toDnsZoneAssociation', () => {
  it('reads both references and the Accepted condition', () => {
    const result = toDnsZoneAssociation({
      metadata: rawMetadata({ name: 'prod-web' }),
      spec: { dnsZoneRef: { name: 'prod' }, resolverContextRef: { name: 'ctx-web' } },
      status: {
        conditions: [
          { type: 'Accepted', status: 'False', reason: 'ApexConflict', message: 'taken' },
        ],
      },
    } as never);
    expect(result).toEqual({
      name: 'prod-web',
      zoneName: 'prod',
      contextName: 'ctx-web',
      accepted: { status: 'False', reason: 'ApexConflict', message: 'taken' },
      deleting: false,
    });
  });

  it('leaves accepted unset before the DNS service has looked at it', () => {
    const result = toDnsZoneAssociation({
      metadata: rawMetadata({ name: 'new' }),
      spec: { dnsZoneRef: { name: 'prod' }, resolverContextRef: { name: 'ctx-web' } },
    } as never);
    expect(result.accepted).toBeUndefined();
  });
});

describe('toDnsResolverContext', () => {
  it('reads the network labels and the default zone', () => {
    const result = toDnsResolverContext({
      metadata: rawMetadata({
        name: 'ctx-web',
        labels: { [NETWORK_LABEL]: 'web', [NETWORK_UID_LABEL]: 'uid-web' },
        annotations: { 'kubernetes.io/description': 'Private DNS for the web VPC' },
      }),
      status: { managedNamespace: { dnsZoneRef: { name: 'managed-web' } } },
    } as never);
    expect(result).toMatchObject({
      name: 'ctx-web',
      networkName: 'web',
      networkUid: 'uid-web',
      description: 'Private DNS for the web VPC',
      managedZoneName: 'managed-web',
      deleting: false,
    });
  });
});

describe('getPrivateZoneVpcLinks', () => {
  it('maps association status to link state', () => {
    const links = getPrivateZoneVpcLinks(
      { name: 'prod' },
      [
        association({ name: 'a', contextName: 'ctx-a' }),
        association({ name: 'b', contextName: 'ctx-b', accepted: undefined }),
        association({
          name: 'c',
          contextName: 'ctx-c',
          accepted: { status: 'False', reason: 'ApexConflict' },
        }),
      ],
      []
    );
    expect(links.map((link) => [link.key, link.state, link.reason])).toEqual([
      ['a', 'linked', undefined],
      ['b', 'linking', undefined],
      ['c', 'failed', 'ApexConflict'],
    ]);
  });

  it('skips other zones and links being deleted', () => {
    const links = getPrivateZoneVpcLinks(
      { name: 'prod' },
      [association({ zoneName: 'other' }), association({ name: 'gone', deleting: true })],
      []
    );
    expect(links).toEqual([]);
  });

  it('lists the owning VPC first for a default zone, without an association', () => {
    const links = getPrivateZoneVpcLinks(
      { name: 'managed-web', managedByContext: 'ctx-web' },
      [association({ name: 'extra', zoneName: 'managed-web', contextName: 'ctx-api' })],
      [context(), context({ name: 'ctx-api', networkName: 'api' })]
    );
    expect(links.map((link) => [link.label, link.isOwner, link.state])).toEqual([
      ['web', true, 'linked'],
      ['api', false, 'linked'],
    ]);
  });

  it('names the VPC by display name, matching on UID before name', () => {
    const links = getPrivateZoneVpcLinks(
      { name: 'prod' },
      [association()],
      [context({ networkUid: 'uid-new' })],
      [
        { name: 'web', uid: 'uid-old', displayName: 'Old web' },
        { name: 'web', uid: 'uid-new', displayName: 'Web' },
      ]
    );
    expect(links[0]).toMatchObject({ label: 'Web', networkName: 'web' });
  });

  it('falls back to the context name when the context has no network labels', () => {
    const links = getPrivateZoneVpcLinks(
      { name: 'prod' },
      [association()],
      [context({ networkName: undefined })]
    );
    expect(links[0].label).toBe('ctx-web');
  });
});

describe('getPrivateZoneState', () => {
  const linked = getPrivateZoneVpcLinks({ name: 'prod' }, [association()], []);

  it('is unlinked with no accepted link, whatever the zone reports', () => {
    expect(getPrivateZoneState(programmed('True', 'Programmed'), [])).toBe('unlinked');
    const failedLink = getPrivateZoneVpcLinks(
      { name: 'prod' },
      [association({ accepted: { status: 'False', reason: 'ApexConflict' } })],
      []
    );
    expect(getPrivateZoneState(programmed('True', 'Programmed'), failedLink)).toBe('unlinked');
  });

  it('is ready once programmed', () => {
    expect(getPrivateZoneState(programmed('True', 'Programmed'), linked)).toBe('ready');
  });

  it('treats awaiting replica application and no condition as preparing', () => {
    expect(getPrivateZoneState(programmed('False', 'PendingReplicaApplication'), linked)).toBe(
      'preparing'
    );
    expect(getPrivateZoneState({ status: {} }, linked)).toBe('preparing');
  });

  it('is failed for any other Programmed=False reason', () => {
    expect(getPrivateZoneState(programmed('False', 'InvalidZone'), linked)).toBe('failed');
  });
});

describe('describeLinkFailure', () => {
  it('explains known reasons and falls back to the API message', () => {
    expect(describeLinkFailure('ApexConflict')).toMatch(/same name/);
    expect(describeLinkFailure('Other', ' custom ')).toBe('custom');
    expect(describeLinkFailure()).toMatch(/not accepted/);
  });
});
