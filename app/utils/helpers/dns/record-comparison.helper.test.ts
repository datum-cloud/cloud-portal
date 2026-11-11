import {
  findRecordIndex,
  isDuplicateRecord,
  normalizeDomainName,
  normalizeRecordName,
  type ComparableDnsRecord,
} from './record-comparison.helper';
import { describe, expect, it } from 'vitest';

describe('normalizeDomainName', () => {
  it.each([
    ['example.com.', 'example.com'],
    ['example.com', 'example.com'],
    ['', ''],
    [undefined, ''],
    [null, ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeDomainName(input)).toBe(expected);
  });
});

describe('normalizeRecordName', () => {
  it.each([
    ['@', '@'],
    ['', '@'],
    [undefined, '@'],
    [null, '@'],
    ['www', 'www'],
    ['www.example.com.', 'www.example.com'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeRecordName(input)).toBe(expected);
  });
});

interface DuplicateCase {
  title: string;
  recordType: string;
  incoming: ComparableDnsRecord;
  existing: ComparableDnsRecord;
  expected: boolean;
}

const soa = {
  mname: 'ns1.example.com.',
  rname: 'admin.example.com.',
  refresh: 3600,
  retry: 600,
  expire: 604800,
  ttl: 3600,
};

const DUPLICATE_CASES: DuplicateCase[] = [
  // Value + TTL types
  {
    title: 'A with the same address and TTL',
    recordType: 'A',
    incoming: { name: 'www', ttl: 300, a: { content: '192.0.2.1' } },
    existing: { name: 'www', ttl: 300, a: { content: '192.0.2.1' } },
    expected: true,
  },
  {
    title: 'A with the same address and a different TTL',
    recordType: 'A',
    incoming: { name: 'www', ttl: 300, a: { content: '192.0.2.1' } },
    existing: { name: 'www', ttl: 3600, a: { content: '192.0.2.1' } },
    expected: false,
  },
  {
    title: 'A where one TTL is null and the other is absent',
    recordType: 'A',
    incoming: { name: 'www', ttl: null, a: { content: '192.0.2.1' } },
    existing: { name: 'www', a: { content: '192.0.2.1' } },
    expected: true,
  },
  {
    title: 'A with a different address',
    recordType: 'A',
    incoming: { name: 'www', a: { content: '192.0.2.1' } },
    existing: { name: 'www', a: { content: '192.0.2.2' } },
    expected: false,
  },
  {
    title: 'AAAA with the same address',
    recordType: 'AAAA',
    incoming: { name: 'www', aaaa: { content: '2001:db8::1' } },
    existing: { name: 'www', aaaa: { content: '2001:db8::1' } },
    expected: true,
  },
  {
    title: 'TXT with the same content',
    recordType: 'TXT',
    incoming: { name: '@', txt: { content: 'v=spf1 -all' } },
    existing: { name: '@', txt: { content: 'v=spf1 -all' } },
    expected: true,
  },
  {
    title: 'TXT with different content',
    recordType: 'TXT',
    incoming: { name: '@', txt: { content: 'v=spf1 -all' } },
    existing: { name: '@', txt: { content: 'v=spf1 ~all' } },
    expected: false,
  },
  {
    title: 'CAA with the same flag, tag and value',
    recordType: 'CAA',
    incoming: { name: '@', caa: { flag: 0, tag: 'issue', value: 'letsencrypt.org' } },
    existing: { name: '@', caa: { flag: 0, tag: 'issue', value: 'letsencrypt.org' } },
    expected: true,
  },
  {
    title: 'CAA with a different tag',
    recordType: 'CAA',
    incoming: { name: '@', caa: { flag: 0, tag: 'issue', value: 'letsencrypt.org' } },
    existing: { name: '@', caa: { flag: 0, tag: 'issuewild', value: 'letsencrypt.org' } },
    expected: false,
  },
  {
    title: 'TLSA with the same fields',
    recordType: 'TLSA',
    incoming: {
      name: '_443._tcp',
      tlsa: { usage: 3, selector: 1, matchingType: 1, certData: 'abcd' },
    },
    existing: {
      name: '_443._tcp',
      tlsa: { usage: 3, selector: 1, matchingType: 1, certData: 'abcd' },
    },
    expected: true,
  },
  {
    title: 'TLSA with different certificate data',
    recordType: 'TLSA',
    incoming: {
      name: '_443._tcp',
      tlsa: { usage: 3, selector: 1, matchingType: 1, certData: 'abcd' },
    },
    existing: {
      name: '_443._tcp',
      tlsa: { usage: 3, selector: 1, matchingType: 1, certData: 'ef01' },
    },
    expected: false,
  },

  // Domain-name types: a trailing dot never makes a difference
  {
    title: 'CNAME whose targets differ only by the trailing dot',
    recordType: 'CNAME',
    incoming: { name: 'www', cname: { content: 'example.com.' } },
    existing: { name: 'www', cname: { content: 'example.com' } },
    expected: true,
  },
  {
    title: 'CNAME with the same target and a different TTL',
    recordType: 'CNAME',
    incoming: { name: 'www', ttl: 300, cname: { content: 'example.com' } },
    existing: { name: 'www', ttl: 3600, cname: { content: 'example.com' } },
    expected: true,
  },
  {
    title: 'CNAME with a different target',
    recordType: 'CNAME',
    incoming: { name: 'www', cname: { content: 'example.com' } },
    existing: { name: 'www', cname: { content: 'example.net' } },
    expected: false,
  },
  {
    title: 'ALIAS whose targets differ only by the trailing dot',
    recordType: 'ALIAS',
    incoming: { name: '@', alias: { content: 'lb.example.net.' } },
    existing: { name: '@', alias: { content: 'lb.example.net' } },
    expected: true,
  },
  {
    title: 'ALIAS with a different target',
    recordType: 'ALIAS',
    incoming: { name: '@', alias: { content: 'lb.example.net' } },
    existing: { name: '@', alias: { content: 'lb.example.org' } },
    expected: false,
  },
  {
    title: 'NS whose nameservers differ only by the trailing dot',
    recordType: 'NS',
    incoming: { name: '@', ns: { content: 'ns1.example.com.' } },
    existing: { name: '@', ns: { content: 'ns1.example.com' } },
    expected: true,
  },
  {
    title: 'NS with a different nameserver',
    recordType: 'NS',
    incoming: { name: '@', ns: { content: 'ns1.example.com' } },
    existing: { name: '@', ns: { content: 'ns2.example.com' } },
    expected: false,
  },
  {
    title: 'PTR whose targets differ only by the trailing dot',
    recordType: 'PTR',
    incoming: { name: '1', ptr: { content: 'host.example.com.' } },
    existing: { name: '1', ptr: { content: 'host.example.com' } },
    expected: true,
  },
  {
    title: 'PTR with a different target',
    recordType: 'PTR',
    incoming: { name: '1', ptr: { content: 'host.example.com' } },
    existing: { name: '1', ptr: { content: 'other.example.com' } },
    expected: false,
  },

  // MX
  {
    title: 'MX with the same preference and an exchange that differs by the trailing dot',
    recordType: 'MX',
    incoming: { name: '@', mx: { preference: 10, exchange: 'mail.example.com.' } },
    existing: { name: '@', mx: { preference: 10, exchange: 'mail.example.com' } },
    expected: true,
  },
  {
    title: 'MX with a different preference',
    recordType: 'MX',
    incoming: { name: '@', mx: { preference: 10, exchange: 'mail.example.com' } },
    existing: { name: '@', mx: { preference: 20, exchange: 'mail.example.com' } },
    expected: false,
  },
  {
    title: 'MX with a different exchange',
    recordType: 'MX',
    incoming: { name: '@', mx: { preference: 10, exchange: 'mail.example.com' } },
    existing: { name: '@', mx: { preference: 10, exchange: 'mx2.example.com' } },
    expected: false,
  },
  {
    title: 'MX where the existing record has no mx data',
    recordType: 'MX',
    incoming: { name: '@', mx: { preference: 10, exchange: 'mail.example.com' } },
    existing: { name: '@' },
    expected: false,
  },

  // SRV
  {
    title: 'SRV with the same fields and a target that differs by the trailing dot',
    recordType: 'SRV',
    incoming: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 5, port: 5060, target: 'sip.example.com.' },
    },
    existing: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 5, port: 5060, target: 'sip.example.com' },
    },
    expected: true,
  },
  {
    title: 'SRV with a different port',
    recordType: 'SRV',
    incoming: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 5, port: 5060, target: 'sip.example.com' },
    },
    existing: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 5, port: 5061, target: 'sip.example.com' },
    },
    expected: false,
  },
  {
    title: 'SRV with a different weight',
    recordType: 'SRV',
    incoming: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 5, port: 5060, target: 'sip.example.com' },
    },
    existing: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 6, port: 5060, target: 'sip.example.com' },
    },
    expected: false,
  },
  {
    title: 'SRV where the incoming record has no srv data',
    recordType: 'SRV',
    incoming: { name: '_sip._tcp' },
    existing: {
      name: '_sip._tcp',
      srv: { priority: 10, weight: 5, port: 5060, target: 'sip.example.com' },
    },
    expected: false,
  },

  // SOA
  {
    title: 'SOA that differs only by serial and trailing dots',
    recordType: 'SOA',
    incoming: { name: '@', soa: { ...soa, serial: 2026010101 } },
    existing: {
      name: '@',
      soa: { ...soa, mname: 'ns1.example.com', rname: 'admin.example.com', serial: 2026010102 },
    },
    expected: true,
  },
  {
    title: 'SOA with a different refresh',
    recordType: 'SOA',
    incoming: { name: '@', soa },
    existing: { name: '@', soa: { ...soa, refresh: 7200 } },
    expected: false,
  },
  {
    title: 'SOA with a different primary nameserver',
    recordType: 'SOA',
    incoming: { name: '@', soa },
    existing: { name: '@', soa: { ...soa, mname: 'ns2.example.com.' } },
    expected: false,
  },
  {
    title: 'SOA where the existing record has no soa data',
    recordType: 'SOA',
    incoming: { name: '@', soa },
    existing: { name: '@' },
    expected: false,
  },

  // HTTPS / SVCB
  {
    title: 'HTTPS with the same priority, target and params',
    recordType: 'HTTPS',
    incoming: {
      name: '@',
      https: { priority: 1, target: 'svc.example.com.', params: { alpn: 'h2' } },
    },
    existing: {
      name: '@',
      https: { priority: 1, target: 'svc.example.com', params: { alpn: 'h2' } },
    },
    expected: true,
  },
  {
    title: 'HTTPS where one side has no params and the other has an empty set',
    recordType: 'HTTPS',
    incoming: { name: '@', https: { priority: 1, target: 'svc.example.com' } },
    existing: { name: '@', https: { priority: 1, target: 'svc.example.com', params: {} } },
    expected: true,
  },
  {
    title: 'HTTPS with different params',
    recordType: 'HTTPS',
    incoming: {
      name: '@',
      https: { priority: 1, target: 'svc.example.com', params: { alpn: 'h2' } },
    },
    existing: {
      name: '@',
      https: { priority: 1, target: 'svc.example.com', params: { alpn: 'h3' } },
    },
    expected: false,
  },
  {
    title: 'HTTPS with a different priority',
    recordType: 'HTTPS',
    incoming: { name: '@', https: { priority: 1, target: 'svc.example.com' } },
    existing: { name: '@', https: { priority: 2, target: 'svc.example.com' } },
    expected: false,
  },
  {
    title: 'SVCB with the same priority, target and params',
    recordType: 'SVCB',
    incoming: {
      name: '_dns',
      svcb: { priority: 1, target: 'dns.example.com.', params: { port: '853' } },
    },
    existing: {
      name: '_dns',
      svcb: { priority: 1, target: 'dns.example.com', params: { port: '853' } },
    },
    expected: true,
  },
  {
    title: 'SVCB with a different target',
    recordType: 'SVCB',
    incoming: { name: '_dns', svcb: { priority: 1, target: 'dns.example.com' } },
    existing: { name: '_dns', svcb: { priority: 1, target: 'dns2.example.com' } },
    expected: false,
  },
  {
    title: 'SVCB where the existing record has no svcb data',
    recordType: 'SVCB',
    incoming: { name: '_dns', svcb: { priority: 1, target: 'dns.example.com' } },
    existing: { name: '_dns' },
    expected: false,
  },

  // Owner name
  {
    title: 'the same value at a different owner name',
    recordType: 'A',
    incoming: { name: 'www', a: { content: '192.0.2.1' } },
    existing: { name: 'api', a: { content: '192.0.2.1' } },
    expected: false,
  },
  {
    title: 'the same MX at a different owner name',
    recordType: 'MX',
    incoming: { name: '@', mx: { preference: 10, exchange: 'mail.example.com' } },
    existing: { name: 'sub', mx: { preference: 10, exchange: 'mail.example.com' } },
    expected: false,
  },
  {
    title: 'an apex record written as @ and as an empty name',
    recordType: 'A',
    incoming: { name: '@', a: { content: '192.0.2.1' } },
    existing: { name: '', a: { content: '192.0.2.1' } },
    expected: true,
  },
  {
    title: 'owner names that differ only by the trailing dot',
    recordType: 'A',
    incoming: { name: 'www.example.com.', a: { content: '192.0.2.1' } },
    existing: { name: 'www.example.com', a: { content: '192.0.2.1' } },
    expected: true,
  },
];

describe('isDuplicateRecord', () => {
  it.each(DUPLICATE_CASES)(
    '$title -> $expected',
    ({ recordType, incoming, existing, expected }) => {
      expect(isDuplicateRecord(incoming, [existing], recordType)).toBe(expected);
    }
  );

  it('returns false when there are no existing records', () => {
    expect(isDuplicateRecord({ name: 'www', a: { content: '192.0.2.1' } }, [], 'A')).toBe(false);
  });

  it('finds a duplicate anywhere in the existing list', () => {
    const existing: ComparableDnsRecord[] = [
      { name: 'www', a: { content: '192.0.2.1' } },
      { name: 'www', a: { content: '192.0.2.2' } },
      { name: 'api', a: { content: '192.0.2.3' } },
    ];

    expect(isDuplicateRecord({ name: 'www', a: { content: '192.0.2.2' } }, existing, 'A')).toBe(
      true
    );
    expect(isDuplicateRecord({ name: 'www', a: { content: '192.0.2.3' } }, existing, 'A')).toBe(
      false
    );
  });
});

describe('findRecordIndex', () => {
  const aRecords: ComparableDnsRecord[] = [
    { name: 'www', ttl: 300, a: { content: '192.0.2.1' } },
    { name: 'www', a: { content: '192.0.2.2' } },
    { name: '@', ttl: 3600, a: { content: '192.0.2.3' } },
  ];

  it('returns the first record at the name when only a name is given', () => {
    expect(findRecordIndex(aRecords, 'A', { name: 'www' })).toBe(0);
  });

  it('narrows by value', () => {
    expect(findRecordIndex(aRecords, 'A', { name: 'www', value: '192.0.2.2' })).toBe(1);
  });

  it('treats an empty name and @ as the apex', () => {
    expect(findRecordIndex(aRecords, 'A', { name: '' })).toBe(2);
  });

  it('matches a null TTL criterion against a record without a TTL', () => {
    expect(findRecordIndex(aRecords, 'A', { name: 'www', ttl: null })).toBe(1);
  });

  it('matches a numeric TTL criterion exactly', () => {
    expect(findRecordIndex(aRecords, 'A', { name: 'www', ttl: 300 })).toBe(0);
    expect(findRecordIndex(aRecords, 'A', { name: 'www', ttl: 60 })).toBe(-1);
  });

  it('returns -1 when the name, value or TTL does not match', () => {
    expect(findRecordIndex(aRecords, 'A', { name: 'missing' })).toBe(-1);
    expect(findRecordIndex(aRecords, 'A', { name: 'www', value: '192.0.2.9' })).toBe(-1);
    expect(findRecordIndex(aRecords, 'A', { name: 'www', value: '192.0.2.2', ttl: 300 })).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(findRecordIndex([], 'A', { name: 'www' })).toBe(-1);
  });

  it.each([
    ['CNAME', { name: 'www', cname: { content: 'example.com.' } }],
    ['ALIAS', { name: 'www', alias: { content: 'example.com.' } }],
    ['NS', { name: 'www', ns: { content: 'example.com.' } }],
    ['PTR', { name: 'www', ptr: { content: 'example.com.' } }],
  ] satisfies [string, ComparableDnsRecord][])(
    'ignores the trailing dot when matching a %s value',
    (recordType, record) => {
      expect(findRecordIndex([record], recordType, { name: 'www', value: 'example.com' })).toBe(0);
      expect(findRecordIndex([record], recordType, { name: 'www', value: 'example.net' })).toBe(-1);
    }
  );

  it('matches composite values in their flattened form, without dot normalization', () => {
    const mxRecords: ComparableDnsRecord[] = [
      { name: '@', mx: { preference: 10, exchange: 'mail.example.com.' } },
    ];

    expect(findRecordIndex(mxRecords, 'MX', { name: '@', value: '10|mail.example.com.' })).toBe(0);
    expect(findRecordIndex(mxRecords, 'MX', { name: '@', value: '10|mail.example.com' })).toBe(-1);
  });
});
