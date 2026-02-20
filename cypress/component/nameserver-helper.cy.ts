import type { DnsZone } from '@/resources/dns-zones';
import type { IDnsNameserver } from '@/resources/domains';
import { getNameserverSetupStatus } from '@/utils/helpers/dns/nameserver.helper';

const makeZone = (params: {
  datumNs: string[];
  zoneNs: Array<Pick<IDnsNameserver, 'hostname'>>;
}): DnsZone => {
  return {
    uid: 'example-zone-uid',
    name: 'example-zone',
    displayName: 'Example Zone',
    namespace: 'default',
    resourceVersion: '1',
    createdAt: new Date(),
    domainName: 'example.com',
    dnsZoneClassName: 'default',
    status: {
      nameservers: params.datumNs,
      domainRef: {
        name: 'example.com',
        status: {
          nameservers: params.zoneNs as IDnsNameserver[],
        },
      },
    },
  } as DnsZone;
};

describe('getNameserverSetupStatus', () => {
  it('fully setup when trailing dots and case differ', () => {
    const zone = makeZone({
      datumNs: ['ns1.datum.com.', 'ns2.datum.com'],
      zoneNs: [{ hostname: 'NS1.DATUM.COM' }, { hostname: 'ns2.datum.com.' }],
    });

    const result = getNameserverSetupStatus(zone);

    expect(result.totalCount).to.equal(2);
    expect(result.setupCount).to.equal(2);
    expect(result.isFullySetup).to.equal(true);
    expect(result.isPartiallySetup).to.equal(false);
    expect(result.hasAnySetup).to.equal(true);
  });

  it('partial setup when only some nameservers match', () => {
    const zone = makeZone({
      datumNs: ['ns1.datum.com', 'ns2.datum.com'],
      zoneNs: [{ hostname: 'ns1.datum.com.' }],
    });

    const result = getNameserverSetupStatus(zone);

    expect(result.totalCount).to.equal(2);
    expect(result.setupCount).to.equal(1);
    expect(result.isFullySetup).to.equal(false);
    expect(result.isPartiallySetup).to.equal(true);
    expect(result.hasAnySetup).to.equal(true);
  });

  it('no setup when none match', () => {
    const zone = makeZone({
      datumNs: ['ns1.datum.com', 'ns2.datum.com'],
      zoneNs: [{ hostname: 'ns3.other.com.' }],
    });

    const result = getNameserverSetupStatus(zone);

    expect(result.totalCount).to.equal(2);
    expect(result.setupCount).to.equal(0);
    expect(result.isFullySetup).to.equal(false);
    expect(result.isPartiallySetup).to.equal(false);
    expect(result.hasAnySetup).to.equal(false);
  });

  it('trims whitespace and ignores single trailing dot', () => {
    const zone = makeZone({
      datumNs: ['ns1.datum.com. '],
      zoneNs: [{ hostname: ' ns1.datum.com' }],
    });

    const result = getNameserverSetupStatus(zone);

    expect(result.totalCount).to.equal(1);
    expect(result.setupCount).to.equal(1);
    expect(result.isFullySetup).to.equal(true);
    expect(result.isPartiallySetup).to.equal(false);
    expect(result.hasAnySetup).to.equal(true);
  });
});
