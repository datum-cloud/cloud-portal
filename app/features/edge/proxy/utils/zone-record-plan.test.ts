import { planZoneRecord, relativeRecordName } from './zone-record-plan';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import { describe, expect, test } from 'bun:test';

const ZONE = 'mdj-test.online';
const TARGET = '28f4e7ee780ee3c7ae68d43fa9c441bf.acme-validation.datum-staging.net';

const certificateRecord = {
  name: `_acme-challenge.app.${ZONE}`,
  type: 'CNAME',
  content: TARGET,
  purpose: 'Certificate',
  managedBy: 'User',
  state: 'Missing',
};

const ownershipRecord = {
  name: `datum-custom-hostname.app.${ZONE}`,
  type: 'TXT',
  content: '15ebd940-2281-4fa3-b266-89cfb852a402',
  purpose: 'Ownership',
  managedBy: 'User',
  state: 'Missing',
};

function zoneRecord(overrides: Partial<IFlattenedDnsRecord>): IFlattenedDnsRecord {
  return {
    dnsZoneId: 'mdj-test-online',
    recordSetName: 'acme-app',
    type: 'CNAME',
    name: '_acme-challenge.app',
    value: `${TARGET}.`,
    rawData: {},
    ...overrides,
  } as IFlattenedDnsRecord;
}

describe('relativeRecordName', () => {
  test('strips the zone and any trailing dot', () => {
    expect(relativeRecordName(`_acme-challenge.app.${ZONE}.`, ZONE)).toBe('_acme-challenge.app');
    expect(relativeRecordName(ZONE, ZONE)).toBe('@');
    expect(relativeRecordName('other.example.com', ZONE)).toBeUndefined();
  });
});

describe('planZoneRecord', () => {
  test('adds the certificate CNAME to an empty name', () => {
    expect(planZoneRecord(certificateRecord, ZONE, [])).toEqual({
      kind: 'add',
      name: '_acme-challenge.app',
    });
  });

  test('a CNAME already in the zone (trailing dot or not) is present', () => {
    expect(planZoneRecord(certificateRecord, ZONE, [zoneRecord({})]).kind).toBe('present');
    expect(planZoneRecord(certificateRecord, ZONE, [zoneRecord({ value: TARGET })]).kind).toBe(
      'present'
    );
  });

  test('a TXT holding the CNAME target at the same name must be replaced', () => {
    const wrongType = zoneRecord({ type: 'TXT', value: `"${TARGET}"` });
    expect(planZoneRecord(certificateRecord, ZONE, [wrongType])).toEqual({
      kind: 'replace',
      name: '_acme-challenge.app',
      conflicts: [wrongType],
    });
  });

  test('a CNAME pointing somewhere else is replaced', () => {
    const stale = zoneRecord({ value: 'old.acme-validation.datum-staging.net.' });
    expect(planZoneRecord(certificateRecord, ZONE, [stale]).kind).toBe('replace');
  });

  test('never offers to replace a record an ALB manages', () => {
    const albRecord = zoneRecord({
      type: 'ALIAS',
      value: 'x.datumproxy.net.',
      managedByGateway: true,
    });
    expect(planZoneRecord(certificateRecord, ZONE, [albRecord])).toEqual({
      kind: 'blocked',
      reason: 'alb',
    });
  });

  test('a TXT can sit beside other TXTs at its name', () => {
    const otherTxt = zoneRecord({
      type: 'TXT',
      name: 'datum-custom-hostname.app',
      value: '"something-else"',
    });
    expect(planZoneRecord(ownershipRecord, ZONE, [otherTxt])).toEqual({
      kind: 'add',
      name: 'datum-custom-hostname.app',
    });
  });

  test('a quoted TXT with the same value is present', () => {
    const sameTxt = zoneRecord({
      type: 'TXT',
      name: 'datum-custom-hostname.app',
      value: `"${ownershipRecord.content}"`,
    });
    expect(planZoneRecord(ownershipRecord, ZONE, [sameTxt]).kind).toBe('present');
  });

  test('names outside the zone and ALIAS records are not created here', () => {
    expect(
      planZoneRecord({ ...certificateRecord, name: '_acme-challenge.example.com' }, ZONE, []).kind
    ).toBe('unsupported');
    expect(planZoneRecord({ ...certificateRecord, type: 'ALIAS' }, ZONE, []).kind).toBe(
      'unsupported'
    );
  });

  test('never replaces a record it could not put back', () => {
    const unnamed = zoneRecord({ type: 'TXT', value: '"x"', recordSetName: undefined });
    expect(planZoneRecord(certificateRecord, ZONE, [unnamed])).toEqual({
      kind: 'blocked',
      reason: 'unrestorable',
    });
    const mx = zoneRecord({ type: 'MX', value: '10 mail.example.com.' });
    expect(planZoneRecord(certificateRecord, ZONE, [mx]).kind).toBe('blocked');
  });
});
