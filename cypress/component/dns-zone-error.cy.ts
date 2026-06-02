import type { IExtendedControlPlaneStatus } from '@/resources/base';
import type { DnsZone } from '@/resources/dns-zones';
import {
  getDnsZoneErrorGuidance,
  getDnsZoneErrorState,
  isDnsZoneErrored,
} from '@/utils/helpers/dns';

/** Loose factory so tests only specify the condition fields under test. */
const status = (partial: Partial<IExtendedControlPlaneStatus>): IExtendedControlPlaneStatus =>
  ({ status: 'pending', message: '', ...partial }) as IExtendedControlPlaneStatus;

type Condition = {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
};

const makeZone = (conditions: Condition[]): DnsZone =>
  ({
    uid: 'example-zone-uid',
    name: 'example-zone',
    displayName: 'Example Zone',
    namespace: 'default',
    resourceVersion: '1',
    createdAt: new Date(),
    domainName: 'example.com',
    dnsZoneClassName: 'default',
    status: { conditions },
  }) as DnsZone;

const programmed = (status: 'True' | 'False', reason?: string, message?: string): Condition => ({
  type: 'Programmed',
  status,
  reason,
  message,
});

describe('getDnsZoneErrorState', () => {
  it('returns no error when the zone is missing', () => {
    expect(getDnsZoneErrorState(undefined).hasError).to.equal(false);
    expect(getDnsZoneErrorState(null).hasError).to.equal(false);
  });

  it('returns no error when Programmed is True', () => {
    const zone = makeZone([programmed('True')]);
    expect(getDnsZoneErrorState(zone).hasError).to.equal(false);
  });

  it('returns the reason and message when Programmed is False', () => {
    const zone = makeZone([programmed('False', 'Claimed', 'DNSZone claimed by another resource')]);

    const result = getDnsZoneErrorState(zone);

    expect(result.hasError).to.equal(true);
    expect(result.reason).to.equal('Claimed');
    expect(result.message).to.equal('DNSZone claimed by another resource');
  });
});

describe('isDnsZoneErrored', () => {
  it('is true only when Programmed is explicitly False with a reason', () => {
    expect(isDnsZoneErrored(status({}))).to.equal(false); // no Programmed condition
    expect(isDnsZoneErrored(status({ isProgrammed: true }))).to.equal(false);
    expect(isDnsZoneErrored(status({ isProgrammed: false }))).to.equal(false); // no reason
    expect(isDnsZoneErrored(status({ isProgrammed: false, programmedReason: 'Claimed' }))).to.equal(
      true
    );
  });
});

describe('getDnsZoneErrorGuidance', () => {
  it('maps a "claimed" message to the in-use guidance', () => {
    const guidance = getDnsZoneErrorGuidance('Claimed', 'DNSZone claimed by another resource');
    expect(guidance.title).to.equal('This domain is already in use');
  });

  it('maps an invalid-domain message', () => {
    expect(getDnsZoneErrorGuidance(undefined, 'invalid domain name').title).to.equal(
      'Invalid domain name'
    );
  });

  it('maps a quota message', () => {
    expect(getDnsZoneErrorGuidance(undefined, 'project quota exceeded').title).to.equal(
      'DNS zone limit reached'
    );
  });

  it('maps a delegation message but not a benign nameserver mention', () => {
    expect(
      getDnsZoneErrorGuidance(undefined, 'nameservers not configured at registrar').title
    ).to.equal('Nameserver delegation incomplete');

    // A message that merely mentions "nameserver" without an error context should
    // NOT be categorized as a delegation failure — it falls through to generic.
    expect(getDnsZoneErrorGuidance(undefined, 'fetching nameserver records').title).to.equal(
      'DNS Zone configuration error'
    );
  });

  it('maps a generic backend failure', () => {
    expect(getDnsZoneErrorGuidance(undefined, 'programming failed: internal error').title).to.equal(
      'DNS zone provisioning failed'
    );
  });

  it('prefers the more specific rule over the generic one (ordering)', () => {
    // Message matches both the "claimed" rule and the generic "reconcile" rule;
    // the specific rule is listed first, so it must win.
    const guidance = getDnsZoneErrorGuidance(
      undefined,
      'claimed by another resource during reconcile'
    );
    expect(guidance.title).to.equal('This domain is already in use');
  });

  it('falls back to the raw message for an unknown reason', () => {
    const guidance = getDnsZoneErrorGuidance(undefined, 'something very unusual happened');
    expect(guidance.title).to.equal('DNS Zone configuration error');
    expect(guidance.description).to.equal('something very unusual happened');
  });

  it('falls back to a generic description when there is no message', () => {
    const guidance = getDnsZoneErrorGuidance(undefined, '');
    expect(guidance.title).to.equal('DNS Zone configuration error');
    expect(guidance.description).to.contain('Something is preventing this DNS zone');
  });
});
