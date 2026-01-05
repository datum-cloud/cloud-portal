import test from 'node:test';
import assert from 'node:assert/strict';
import { getNameserverSetupStatus } from '../nameserver.helper';
import type { IDnsZoneControlResponse, IDnsNameserver } from '@/resources/interfaces/dns.interface';

const makeZone = (params: {
  datumNs: string[];
  zoneNs: Array<Pick<IDnsNameserver, 'hostname'>>;
}): IDnsZoneControlResponse => {
  return {
    apiVersion: 'v1',
    kind: 'DNSZone',
    name: 'example-zone',
    namespace: 'default',
    domainName: 'example.com',
    status: {
      nameservers: params.datumNs,
      domainRef: {
        name: 'example.com',
        status: {
          nameservers: params.zoneNs as IDnsNameserver[],
        },
      },
    },
  } as unknown as IDnsZoneControlResponse;
};

test('getNameserverSetupStatus: fully setup when trailing dots and case differ', () => {
  const zone = makeZone({
    datumNs: ['ns1.datum.com.', 'ns2.datum.com'],
    zoneNs: [
      { hostname: 'NS1.DATUM.COM' },
      { hostname: 'ns2.datum.com.' },
    ],
  });

  const result = getNameserverSetupStatus(zone);

  assert.equal(result.totalCount, 2);
  assert.equal(result.setupCount, 2);
  assert.equal(result.isFullySetup, true);
  assert.equal(result.isPartiallySetup, false);
  assert.equal(result.hasAnySetup, true);
});

test('getNameserverSetupStatus: partial setup when only some nameservers match', () => {
  const zone = makeZone({
    datumNs: ['ns1.datum.com', 'ns2.datum.com'],
    zoneNs: [{ hostname: 'ns1.datum.com.' }],
  });

  const result = getNameserverSetupStatus(zone);

  assert.equal(result.totalCount, 2);
  assert.equal(result.setupCount, 1);
  assert.equal(result.isFullySetup, false);
  assert.equal(result.isPartiallySetup, true);
  assert.equal(result.hasAnySetup, true);
});

test('getNameserverSetupStatus: no setup when none match', () => {
  const zone = makeZone({
    datumNs: ['ns1.datum.com', 'ns2.datum.com'],
    zoneNs: [{ hostname: 'ns3.other.com.' }],
  });

  const result = getNameserverSetupStatus(zone);

  assert.equal(result.totalCount, 2);
  assert.equal(result.setupCount, 0);
  assert.equal(result.isFullySetup, false);
  assert.equal(result.isPartiallySetup, false);
  assert.equal(result.hasAnySetup, false);
});

test('getNameserverSetupStatus: trims whitespace and ignores single trailing dot', () => {
  const zone = makeZone({
    datumNs: ['ns1.datum.com. '],
    zoneNs: [{ hostname: ' ns1.datum.com' }],
  });

  const result = getNameserverSetupStatus(zone);

  assert.equal(result.totalCount, 1);
  assert.equal(result.setupCount, 1);
  assert.equal(result.isFullySetup, true);
  assert.equal(result.isPartiallySetup, false);
  assert.equal(result.hasAnySetup, true);
});


