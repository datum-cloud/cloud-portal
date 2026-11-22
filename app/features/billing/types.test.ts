import { toPastInvoiceRow, type Invoice } from './types';
import { describe, expect, it } from 'vitest';

const invoice = (status: Invoice['status']): Invoice => ({
  metadata: { name: 'ba-datum-yprse3-2026-10-d25320e914' },
  spec: {
    billingAccountRef: { name: 'ba-datum-yprse3' },
    period: { start: '2026-10-01T00:00:00Z', end: '2026-11-01T00:00:00Z' },
  },
  status,
});

describe('toPastInvoiceRow', () => {
  it('shows the number on the invoice and links to its page', () => {
    const row = toPastInvoiceRow(
      invoice({
        phase: 'Open',
        number: 'DATUM-0042',
        total: '120.00',
        currencyCode: 'USD',
        documentUri: 'https://invoice.stripe.com/i/acct_1/test',
      })
    );
    expect(row.invoiceNumber).toBe('DATUM-0042');
    expect(row.url).toBe('https://invoice.stripe.com/i/acct_1/test');
  });

  it("falls back to the invoice's name until it has a number", () => {
    expect(toPastInvoiceRow(invoice({ phase: 'Open' })).invoiceNumber).toBe(
      'ba-datum-yprse3-2026-10-d25320e914'
    );
  });
});
