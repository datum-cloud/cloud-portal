import {
  TXT_CONTENT_MAX_LENGTH,
  createDnsRecordSchema,
  txtRecordDataSchema,
} from './dns-record.schema';
import { describe, expect, it } from 'bun:test';

describe('txtRecordDataSchema', () => {
  it('accepts DKIM-length content beyond a single 255-octet TXT string', () => {
    const content = `v=DKIM1; k=rsa; p=${'A'.repeat(392)}`;
    expect(content.length).toBeGreaterThan(255);
    expect(content.length).toBeLessThanOrEqual(TXT_CONTENT_MAX_LENGTH);

    const result = txtRecordDataSchema.parse({ content });
    expect(result.content).toBe(content);
  });

  it('rejects content longer than the per-record maximum', () => {
    const result = txtRecordDataSchema.safeParse({
      content: 'a'.repeat(TXT_CONTENT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('strips line breaks from wrapped pastes', () => {
    const result = txtRecordDataSchema.parse({
      content: 'v=DKIM1; k=rsa;\np=ABC\r\nDEF',
    });
    expect(result.content).toBe('v=DKIM1; k=rsa;p=ABCDEF');
  });
});

describe('createDnsRecordSchema TXT', () => {
  it('accepts a long TXT record in the form schema', () => {
    const parsed = createDnsRecordSchema.parse({
      recordType: 'TXT',
      name: 'google._domainkey',
      ttl: 3600,
      txt: { content: `v=DKIM1; k=rsa; p=${'A'.repeat(392)}` },
    });
    expect(parsed.recordType).toBe('TXT');
    if (parsed.recordType !== 'TXT') return;
    expect(parsed.txt.content.length).toBeGreaterThan(255);
  });
});
