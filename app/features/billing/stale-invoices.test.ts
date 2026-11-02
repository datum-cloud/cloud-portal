import { isStaleInvoice } from './stale-invoices';
import type { Invoice } from './types';
import { describe, expect, it } from 'vitest';

const invoice = (name: string, annotations: Record<string, string>): Invoice =>
  ({
    metadata: { name, annotations },
    spec: {
      billingAccountRef: { name: 'acme-main' },
      period: { start: '2026-10-10T00:00:00Z', end: '2026-11-10T00:00:00Z' },
    },
  }) as Invoice;

describe('isStaleInvoice', () => {
  it('hides Amberflo invoices', () => {
    expect(
      isStaleInvoice(
        invoice('acme-main-2026-09', { 'amberflo.billing.miloapis.com/invoiceKey': 'k' })
      )
    ).toBe(true);
    expect(
      isStaleInvoice(
        invoice('acme-main-2026-10', {
          'amberflo.billing.miloapis.com/invoiceKey': 'k',
          'openmeter.miloapis.com/invoiceId': '01M4JY',
        })
      )
    ).toBe(true);
  });

  it("hides an older OpenMeter provider's invoices, named without a hash", () => {
    expect(
      isStaleInvoice(invoice('acme-main-2026-10', { 'openmeter.miloapis.com/invoiceId': '01M4JY' }))
    ).toBe(true);
  });

  it("keeps the current OpenMeter provider's invoices", () => {
    expect(
      isStaleInvoice(
        invoice('acme-main-2026-10-1f092bf4d7', { 'openmeter.miloapis.com/invoiceId': '01M63S' })
      )
    ).toBe(false);
  });

  it('keeps invoices from other providers, or without annotations', () => {
    expect(isStaleInvoice(invoice('acme-main-2026-10', {}))).toBe(false);
    expect(isStaleInvoice({ metadata: { name: 'x' } } as Invoice)).toBe(false);
  });
});
