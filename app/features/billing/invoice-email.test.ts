import { invoiceEmail, withInvoiceEmail } from './invoice-email';
import { describe, expect, it } from 'bun:test';

const contact = {
  name: 'Jane Doe',
  businessName: 'Acme Ltd',
  email: 'jane@acme.com',
  address: { country: 'GB', line1: '1 Main St' },
};

describe('invoiceEmail', () => {
  it('is the invoice email, falling back to the billing contact', () => {
    expect(invoiceEmail({ ...contact, invoiceEmails: ['ap@acme.com', 'ignored@acme.com'] })).toBe(
      'ap@acme.com'
    );
    expect(invoiceEmail({ ...contact, invoiceEmails: [] })).toBe('jane@acme.com');
    expect(invoiceEmail(undefined)).toBeUndefined();
  });
});

describe('withInvoiceEmail', () => {
  it('keeps the rest of the contact details and sets one invoice email', () => {
    expect(withInvoiceEmail(contact, ' AP@Acme.com ')).toEqual({
      ...contact,
      invoiceEmails: ['ap@acme.com'],
    });
  });

  it('clears the invoice email when empty', () => {
    expect(
      withInvoiceEmail({ ...contact, invoiceEmails: ['ap@acme.com'] }, '').invoiceEmails
    ).toEqual([]);
  });
});
