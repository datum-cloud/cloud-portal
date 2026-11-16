import { buildBillingCycleWindows, cycleTerms } from './billing-cycle';
import { describe, expect, it } from 'vitest';

const iso = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);

describe('cycleTerms', () => {
  const contract = { startsAt: '2026-04-18T00:00:00Z', billingDayOfMonth: 18 };
  const paymentTerms = { invoiceFrequency: 'Quarterly' as const, invoiceDayOfMonth: 1 };

  it('uses the payment terms before the contract starts', () => {
    expect(
      cycleTerms({ spec: { paymentTerms }, status: { contract } }, new Date('2026-04-17T23:59:59Z'))
    ).toEqual(paymentTerms);
  });

  it("bills monthly on the contract's day once it has started", () => {
    expect(
      cycleTerms({ spec: { paymentTerms }, status: { contract } }, new Date('2026-04-18T00:00:00Z'))
    ).toEqual({ invoiceFrequency: 'Monthly', invoiceDayOfMonth: 18 });
  });

  it('follows a started contract without payment terms', () => {
    expect(cycleTerms({ status: { contract } }, new Date('2026-05-01T00:00:00Z'))).toEqual({
      invoiceFrequency: 'Monthly',
      invoiceDayOfMonth: 18,
    });
  });

  it('is undefined with neither', () => {
    expect(cycleTerms({}, new Date())).toBeUndefined();
    expect(cycleTerms(null)).toBeUndefined();
  });
});

describe('buildBillingCycleWindows', () => {
  it('anchors on the invoice day', () => {
    const [current, previous] = buildBillingCycleWindows(
      { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 18 },
      new Date('2026-11-05T12:00:00Z')
    );
    expect(iso(current.startSec)).toBe('2026-10-18');
    expect(current.label).toBe('Current billing cycle (18 Oct - 18 Nov 2026)');
    expect(iso(previous.startSec)).toBe('2026-09-18');
  });

  it('clamps a contract day past the end of a shorter month, then returns to it', () => {
    const [current, previous] = buildBillingCycleWindows(
      { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 31 },
      new Date('2027-03-10T00:00:00Z')
    );
    expect(iso(current.startSec)).toBe('2027-02-28');
    expect(current.label).toBe('Current billing cycle (28 Feb - 31 Mar 2027)');
    expect(iso(previous.startSec)).toBe('2027-01-31');
  });

  it('defaults to calendar months', () => {
    const [current] = buildBillingCycleWindows(undefined, new Date('2026-11-05T12:00:00Z'));
    expect(iso(current.startSec)).toBe('2026-11-01');
  });
});
