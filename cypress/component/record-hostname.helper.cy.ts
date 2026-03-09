import { getRecordHostname } from '@/utils/helpers/dns/record-hostname.helper';

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
