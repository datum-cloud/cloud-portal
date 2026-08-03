import { extractQuotaDenialLabels } from './quota-metrics';
import { describe, expect, test } from 'bun:test';

const quotaStatus = JSON.stringify({
  kind: 'Status',
  status: 'Failure',
  code: 403,
  reason: 'Forbidden',
  message:
    'dnszones.dns.networking.miloapis.com "my-zone" is forbidden: Insufficient quota resources available.',
  details: { group: 'dns.networking.miloapis.com', kind: 'dnszones', name: 'my-zone' },
});

describe('extractQuotaDenialLabels', () => {
  test('quota-denied status → labels from details (kind is the plural)', () => {
    expect(extractQuotaDenialLabels(quotaStatus)).toEqual({
      group: 'dns.networking.miloapis.com',
      resource: 'dnszones',
    });
  });
  test('RBAC 403 without a quota anchor → null (not counted)', () => {
    expect(
      extractQuotaDenialLabels(
        JSON.stringify({ code: 403, message: 'User "u" cannot create resource "dnszones"' })
      )
    ).toBeNull();
  });
  test('anchor present but unparseable body → unknown labels', () => {
    expect(extractQuotaDenialLabels('Insufficient quota resources available (not json)')).toEqual({
      group: 'unknown',
      resource: 'unknown',
    });
  });
  test('anchor present, parseable, missing details → unknown labels', () => {
    expect(
      extractQuotaDenialLabels(
        JSON.stringify({ message: "You've reached your quota for this resource type" })
      )
    ).toEqual({ group: 'unknown', resource: 'unknown' });
  });
});
