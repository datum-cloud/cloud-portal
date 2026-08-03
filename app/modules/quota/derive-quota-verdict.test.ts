import { deriveQuotaVerdict } from './derive-quota-verdict';
import { describe, expect, test } from 'bun:test';

const RT = 'dns.networking.miloapis.com/dnszones';
const bucket = (available: number, extra = {}) => ({
  uid: 'u',
  name: 'bucket-abc',
  namespace: 'milo-system',
  resourceType: RT,
  status: { limit: 25, allocated: 25 - available, available },
  ...extra,
});
const reg = (type: string) => ({ name: 'r', resourceType: RT, type, displayName: 'DNS Zones' });

describe('deriveQuotaVerdict', () => {
  test('available > 0 → hasQuota', () => {
    const v = deriveQuotaVerdict({
      resourceType: RT,
      buckets: [bucket(15)],
      registrations: [reg('Entity')],
      isError: false,
    });
    expect(v).toMatchObject({
      hasQuota: true,
      isUnknown: false,
      limit: 25,
      allocated: 10,
      available: 15,
    });
  });
  test('available 0 → exhausted', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: [bucket(0)],
        registrations: [],
        isError: false,
      })
    ).toMatchObject({ hasQuota: false, isUnknown: false });
  });
  test('missing bucket → unknown, fail-open', () => {
    expect(
      deriveQuotaVerdict({ resourceType: RT, buckets: [], registrations: [], isError: false })
    ).toMatchObject({ hasQuota: true, isUnknown: true });
  });
  test('bucket without status → unknown, fail-open', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: [bucket(0, { status: undefined })],
        registrations: [],
        isError: false,
      })
    ).toMatchObject({ hasQuota: true, isUnknown: true });
  });
  test('Feature registration → unknown even when exhausted (feature flags are not create gates)', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: [bucket(0)],
        registrations: [reg('Feature')],
        isError: false,
      })
    ).toMatchObject({ hasQuota: true, isUnknown: true });
  });
  test('query error (incl. list 403) → unknown, fail-open', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: undefined,
        registrations: undefined,
        isError: true,
      })
    ).toMatchObject({ hasQuota: true, isUnknown: true });
  });
  test('registration is surfaced for tooltip copy', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: [bucket(0)],
        registrations: [reg('Entity')],
        isError: false,
      }).registration?.displayName
    ).toBe('DNS Zones');
  });
  test('denied + deniedReason are derived once for all consumers', () => {
    const v = deriveQuotaVerdict({
      resourceType: RT,
      buckets: [bucket(0)],
      registrations: [reg('Entity')],
      isError: false,
    });
    expect(v.denied).toBe(true);
    expect(v.deniedReason).toBe(
      "You've reached your DNS Zones quota (25/25). Request an increase from Settings → Quotas."
    );
  });
  test('deniedReason falls back to the resourceType without a registration', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: [bucket(0)],
        registrations: [],
        isError: false,
      }).deniedReason
    ).toBe(`You've reached your ${RT} quota (25/25). Request an increase from Settings → Quotas.`);
  });
  test('denied is false for open and unknown verdicts', () => {
    expect(
      deriveQuotaVerdict({
        resourceType: RT,
        buckets: [bucket(15)],
        registrations: [],
        isError: false,
      }).denied
    ).toBe(false);
    const unknown = deriveQuotaVerdict({
      resourceType: RT,
      buckets: [],
      registrations: [],
      isError: false,
    });
    expect(unknown.denied).toBe(false);
    expect(unknown.deniedReason).toBeUndefined();
  });
});
