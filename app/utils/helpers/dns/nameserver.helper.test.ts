import { getDnsZoneDelegationState, getNameserverSetupStatus } from './nameserver.helper';
import type { DnsZone } from '@/resources/dns-zones';
import { describe, expect, test } from 'bun:test';

const DATUM_NS = ['ns1.datum.net', 'ns2.datum.net'];

function zone(overrides: {
  datumNs?: string[];
  domainNs?: string[] | undefined;
  hasDomain?: boolean;
  programmed?: 'True' | 'False' | 'Unknown';
  reason?: string;
  accepted?: { status: 'True' | 'False'; reason: string };
}): DnsZone {
  const {
    datumNs = DATUM_NS,
    domainNs,
    hasDomain = true,
    programmed = 'True',
    reason,
    accepted,
  } = overrides;
  return {
    name: 'example-com',
    domainName: 'example.com',
    status: {
      nameservers: datumNs,
      conditions: [
        { type: 'Programmed', status: programmed, reason, message: reason ?? '' },
        ...(accepted ? [{ type: 'Accepted', ...accepted, message: '' }] : []),
      ],
      domainRef: hasDomain
        ? {
            name: 'example-com',
            status: domainNs ? { nameservers: domainNs.map((hostname) => ({ hostname })) } : {},
          }
        : undefined,
    },
  } as unknown as DnsZone;
}

describe('getNameserverSetupStatus', () => {
  test('ignores case and a trailing dot when matching nameservers', () => {
    const status = getNameserverSetupStatus(
      zone({ domainNs: ['NS1.datum.net.', 'ns2.datum.net'] })
    );
    expect(status.isFullySetup).toBe(true);
    expect(status.setupCount).toBe(2);
  });

  test('reports nothing set up when Datum has not assigned nameservers yet', () => {
    const status = getNameserverSetupStatus(zone({ datumNs: [], domainNs: ['ns.other.com'] }));
    expect(status).toMatchObject({ isFullySetup: false, isPartiallySetup: false, totalCount: 0 });
  });
});

describe('getDnsZoneDelegationState', () => {
  test('is pending when the domain still points at another DNS host', () => {
    const state = getDnsZoneDelegationState(zone({ domainNs: ['dns1.registrar.com'] }));
    expect(state.isPending).toBe(true);
    expect(state.reason).toBe('nameserverDelegation');
    expect(state.datumNameservers).toEqual(DATUM_NS);
  });

  test('is pending on domain verification while the platform withholds nameservers', () => {
    const state = getDnsZoneDelegationState(
      zone({
        datumNs: [],
        domainNs: ['ns3.cloudflare.com'],
        programmed: 'Unknown',
        accepted: { status: 'False', reason: 'PendingDomainVerification' },
      })
    );
    expect(state.isPending).toBe(true);
    expect(state.reason).toBe('domainVerification');
    expect(state.domainName).toBe('example-com');
  });

  test('reports verification before delegation when both are outstanding', () => {
    const state = getDnsZoneDelegationState(
      zone({ domainNs: [], accepted: { status: 'False', reason: 'PendingDomainVerification' } })
    );
    expect(state.reason).toBe('domainVerification');
  });

  test('has no reason once the zone is fully set up', () => {
    expect(getDnsZoneDelegationState(zone({ domainNs: DATUM_NS })).reason).toBeNull();
  });

  test('is pending when the domain has no nameservers at all yet', () => {
    expect(getDnsZoneDelegationState(zone({ domainNs: [] })).isPending).toBe(true);
  });

  test('is pending when only some Datum nameservers are configured', () => {
    const state = getDnsZoneDelegationState(zone({ domainNs: ['ns1.datum.net'] }));
    expect(state.isPending).toBe(true);
    expect(state.setup.isPartiallySetup).toBe(true);
  });

  test('is not pending once every Datum nameserver is in place', () => {
    expect(getDnsZoneDelegationState(zone({ domainNs: DATUM_NS })).isPending).toBe(false);
  });

  test('is not pending while the domain nameservers are still being looked up', () => {
    expect(getDnsZoneDelegationState(zone({ domainNs: undefined })).isPending).toBe(false);
  });

  test('is not pending while Datum has not assigned nameservers yet', () => {
    expect(getDnsZoneDelegationState(zone({ datumNs: [], domainNs: [] })).isPending).toBe(false);
  });

  test('is not pending for a zone without a backing domain', () => {
    expect(getDnsZoneDelegationState(zone({ hasDomain: false, domainNs: [] })).isPending).toBe(
      false
    );
  });

  test('defers to the error banner when the zone is errored', () => {
    const errored = zone({ domainNs: [], programmed: 'False', reason: 'ProgrammingFailed' });
    expect(getDnsZoneDelegationState(errored).isPending).toBe(false);
  });

  test('trusts a precomputed error flag instead of re-deriving it', () => {
    const healthy = zone({ domainNs: [] });
    expect(getDnsZoneDelegationState(healthy, { hasError: true }).isPending).toBe(false);
    const errored = zone({ domainNs: [], programmed: 'False', reason: 'ProgrammingFailed' });
    expect(getDnsZoneDelegationState(errored, { hasError: false }).isPending).toBe(true);
  });

  test('handles a missing zone', () => {
    expect(getDnsZoneDelegationState(undefined).isPending).toBe(false);
    expect(getDnsZoneDelegationState(null).datumNameservers).toEqual([]);
  });
});
