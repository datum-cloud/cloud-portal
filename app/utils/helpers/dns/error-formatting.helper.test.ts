import {
  formatAlbHostnameDnsConflict,
  formatDnsError,
  formatDnsRecordConflictError,
  parseDnsRrsetConflict,
  unwrapDnsError,
} from './error-formatting.helper';
import { describe, expect, test } from 'bun:test';

const WRAPPED_ALIAS =
  'status 422: {"error": "RRset testing.mdj-test.online. IN ALIAS: Conflicts with pre-existing RRset"}';

describe('unwrapDnsError', () => {
  test('extracts the inner PDNS message from a 422 wrapper', () => {
    expect(unwrapDnsError(WRAPPED_ALIAS)).toBe(
      'RRset testing.mdj-test.online. IN ALIAS: Conflicts with pre-existing RRset'
    );
  });
});

describe('parseDnsRrsetConflict', () => {
  test('parses name and type from a wrapped ALIAS conflict', () => {
    expect(parseDnsRrsetConflict(WRAPPED_ALIAS)).toEqual({
      recordName: 'testing.mdj-test.online',
      recordType: 'ALIAS',
    });
  });

  test('returns undefined for unrelated errors', () => {
    expect(parseDnsRrsetConflict('timeout talking to PowerDNS')).toBeUndefined();
  });
});

describe('formatDnsRecordConflictError', () => {
  test('explains an ALB-managed record colliding with a manual one', () => {
    expect(formatDnsRecordConflictError(WRAPPED_ALIAS, { managedByAlb: true })).toBe(
      "A DNS record you created already exists at testing.mdj-test.online, so Datum can't add this ALB-managed ALIAS. Remove the manual record, then Datum can take over."
    );
  });

  test('explains a generic CNAME/ALIAS clash', () => {
    expect(
      formatDnsRecordConflictError(
        'RRset www.example.com. IN CNAME: Conflicts with pre-existing RRset'
      )
    ).toBe(
      "CNAME records can't share a name with another record type. Remove the existing record at www.example.com, or use a different name."
    );
  });
});

describe('formatAlbHostnameDnsConflict', () => {
  test('names the colliding hostname', () => {
    expect(formatAlbHostnameDnsConflict(WRAPPED_ALIAS)).toBe(
      'A DNS record you created already exists for this hostname (testing.mdj-test.online). Remove that manual record so Datum can program the ALB-managed one.'
    );
  });

  test('falls back to the hostname when the error has no RRset name', () => {
    expect(formatAlbHostnameDnsConflict(undefined, 'test.mdj-test.online')).toContain(
      'test.mdj-test.online'
    );
  });
});

describe('formatDnsError', () => {
  test('never leaves a raw 422 JSON blob in the UI', () => {
    expect(formatDnsError(WRAPPED_ALIAS)).not.toContain('status 422');
    expect(formatDnsError(WRAPPED_ALIAS)).not.toContain('{"error"');
  });
});
