import {
  getNameEndsWithZoneWarning,
  getRecordHostname,
  isApexName,
  isSystemManagedDnsRecord,
} from '@/utils/helpers/dns/record-hostname.helper';

describe('getRecordHostname', () => {
  const zoneDomain = 'example.com';

  describe('empty or @ name → zone domain', () => {
    it('empty string returns zone domain', () => {
      expect(getRecordHostname('', zoneDomain)).to.equal('example.com');
    });

    it('@ returns zone domain', () => {
      expect(getRecordHostname('@', zoneDomain)).to.equal('example.com');
    });

    it('empty name with zone domain that has trailing dot strips zone dot', () => {
      expect(getRecordHostname('', 'example.com.')).to.equal('example.com');
    });

    it('@ with zone domain that has trailing dot strips zone dot', () => {
      expect(getRecordHostname('@', 'example.com.')).to.equal('example.com');
    });
  });

  describe('FQDN heuristic: name with dots → treated as FQDN', () => {
    it('single label (no dots) is relative: name.zoneDomain', () => {
      expect(getRecordHostname('www', zoneDomain)).to.equal('www.example.com');
    });

    it('name with one dot is treated as FQDN (returned as-is, no zone suffix)', () => {
      expect(getRecordHostname('www.example.com', zoneDomain)).to.equal('www.example.com');
    });

    it('name with trailing dot has dot stripped (FQDN)', () => {
      expect(getRecordHostname('api.example.com.', zoneDomain)).to.equal('api.example.com');
    });

    it('subdomain with multiple labels treated as FQDN', () => {
      expect(getRecordHostname('a.b.example.com', zoneDomain)).to.equal('a.b.example.com');
    });

    it('recordName that is exactly zone domain (has dot) returned as-is', () => {
      expect(getRecordHostname('example.com', zoneDomain)).to.equal('example.com');
    });
  });

  describe('simple label (no dots) → name.zoneDomain', () => {
    it('single label becomes name.zoneDomain', () => {
      expect(getRecordHostname('api', zoneDomain)).to.equal('api.example.com');
    });

    it('single label with zone having trailing dot strips zone dot', () => {
      expect(getRecordHostname('api', 'example.com.')).to.equal('api.example.com');
    });
  });

  describe('edge cases and normalization', () => {
    it('null/undefined-like: empty string after trim is not @', () => {
      expect(getRecordHostname('', 'example.com')).to.equal('example.com');
    });

    it('recordName with trailing dot is stripped first; "api." → "api" then name.zoneDomain', () => {
      expect(getRecordHostname('api.', zoneDomain)).to.equal('api.example.com');
    });

    it('zone domain with trailing dot is normalized in result for @', () => {
      expect(getRecordHostname('@', 'zone.with.dots.')).to.equal('zone.with.dots');
    });
  });
});

describe('getNameEndsWithZoneWarning', () => {
  const zoneDomain = 'mdj-test.online';

  it('warns when name already ends with the zone domain (relative suffix)', () => {
    expect(getNameEndsWithZoneWarning('test.mdj-test.online', zoneDomain)).to.equal(
      'This will create test.mdj-test.online.mdj-test.online. Use "test" to create test.mdj-test.online.'
    );
  });

  it('warns when name equals the zone domain (suggests @)', () => {
    expect(getNameEndsWithZoneWarning('mdj-test.online', zoneDomain)).to.equal(
      'This will create mdj-test.online.mdj-test.online. Use "@" for the zone apex.'
    );
  });

  it('does not warn for trailing-dot absolute FQDN', () => {
    expect(getNameEndsWithZoneWarning('test.mdj-test.online.', zoneDomain)).to.equal(null);
  });

  it('is case-insensitive for zone matching', () => {
    expect(getNameEndsWithZoneWarning('Test.MDJ-TEST.ONLINE', zoneDomain)).to.equal(
      'This will create Test.MDJ-TEST.ONLINE.mdj-test.online. Use "Test" to create Test.MDJ-TEST.ONLINE.'
    );
  });

  it('does not warn for simple relative labels', () => {
    expect(getNameEndsWithZoneWarning('www', zoneDomain)).to.equal(null);
    expect(getNameEndsWithZoneWarning('test', zoneDomain)).to.equal(null);
    expect(getNameEndsWithZoneWarning('@', zoneDomain)).to.equal(null);
    expect(getNameEndsWithZoneWarning('', zoneDomain)).to.equal(null);
  });

  it('does not warn when zone domain is missing', () => {
    expect(getNameEndsWithZoneWarning('test.mdj-test.online', '')).to.equal(null);
  });
});

describe('isApexName', () => {
  const zoneDomain = 'example.com';

  it('treats @ as apex', () => {
    expect(isApexName('@', zoneDomain)).to.equal(true);
  });

  it('treats empty and whitespace as apex', () => {
    expect(isApexName('', zoneDomain)).to.equal(true);
    expect(isApexName('   ', zoneDomain)).to.equal(true);
    expect(isApexName(undefined, zoneDomain)).to.equal(true);
  });

  it('treats the zone domain as apex, with or without a trailing dot', () => {
    expect(isApexName('example.com', zoneDomain)).to.equal(true);
    expect(isApexName('example.com.', zoneDomain)).to.equal(true);
    expect(isApexName('example.com', 'example.com.')).to.equal(true);
  });

  it('is case-insensitive for zone matching', () => {
    expect(isApexName('EXAMPLE.COM', zoneDomain)).to.equal(true);
  });

  it('does not treat subdomains as apex', () => {
    expect(isApexName('ns1', zoneDomain)).to.equal(false);
    expect(isApexName('delegated', zoneDomain)).to.equal(false);
    expect(isApexName('ns1.example.com', zoneDomain)).to.equal(false);
  });

  it('still treats @ as apex when zone domain is missing', () => {
    expect(isApexName('@')).to.equal(true);
    expect(isApexName('example.com')).to.equal(false);
  });
});

describe('isSystemManagedDnsRecord', () => {
  const zoneDomain = 'example.com';

  it('locks every SOA record', () => {
    expect(isSystemManagedDnsRecord({ type: 'SOA', name: '@' }, zoneDomain)).to.equal(true);
    expect(isSystemManagedDnsRecord({ type: 'SOA', name: 'example.com' }, zoneDomain)).to.equal(
      true
    );
  });

  it('locks apex NS and leaves subdomain NS unmanaged', () => {
    expect(isSystemManagedDnsRecord({ type: 'NS', name: '@' }, zoneDomain)).to.equal(true);
    expect(isSystemManagedDnsRecord({ type: 'NS', name: 'example.com' }, zoneDomain)).to.equal(
      true
    );
    expect(isSystemManagedDnsRecord({ type: 'NS', name: 'ns1' }, zoneDomain)).to.equal(false);
    expect(isSystemManagedDnsRecord({ type: 'NS', name: 'delegated' }, zoneDomain)).to.equal(false);
  });

  it('does not lock other record types at the apex', () => {
    expect(isSystemManagedDnsRecord({ type: 'A', name: '@' }, zoneDomain)).to.equal(false);
    expect(isSystemManagedDnsRecord({ type: 'MX', name: '@' }, zoneDomain)).to.equal(false);
  });
});
