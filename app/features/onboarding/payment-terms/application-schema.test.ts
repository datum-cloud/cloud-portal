import {
  normalizeWebsite,
  paymentTermsApplicationSchema,
  toApplicationInput,
  type PaymentTermsApplicationValues,
} from './application-schema';
import { describe, expect, it } from 'vitest';

const invoiceValues: PaymentTermsApplicationValues = {
  paymentOption: 'Invoice',
  legalName: ' Acme Corporation Ltd ',
  organizationType: 'Company',
  website: 'acme.com',
  situation: 'We pay vendors by purchase order on net-30 terms.',
  estimatedMonthlySpend: 'From2500To10000',
  accountsPayableEmail: 'ap@acme.com',
  purchaseOrderNumber: 'PO-4471',
  agreementReference: '',
  authorized: true,
};

function errorsFor(values: Partial<PaymentTermsApplicationValues>) {
  const result = paymentTermsApplicationSchema.safeParse({ ...invoiceValues, ...values });
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('paymentTermsApplicationSchema', () => {
  it('accepts a complete invoice application', () => {
    expect(errorsFor({})).toEqual([]);
  });

  it('requires the invoice details only when paying by invoice', () => {
    expect(errorsFor({ estimatedMonthlySpend: undefined, accountsPayableEmail: '' })).toEqual([
      'estimatedMonthlySpend',
      'accountsPayableEmail',
    ]);
    expect(
      errorsFor({
        paymentOption: 'NotSure',
        estimatedMonthlySpend: undefined,
        accountsPayableEmail: '',
      })
    ).toEqual([]);
  });

  it('needs the authorization confirmation', () => {
    expect(errorsFor({ authorized: false })).toEqual(['authorized']);
    expect(errorsFor({ authorized: undefined })).toEqual(['authorized']);
  });

  it('checks the website and situation', () => {
    expect(errorsFor({ website: 'not a website' })).toEqual(['website']);
    expect(errorsFor({ website: 'ftp://acme.com' })).toEqual(['website']);
    expect(errorsFor({ situation: 'x'.repeat(2001) })).toEqual(['situation']);
  });
});

describe('normalizeWebsite', () => {
  it('adds https to a bare domain', () => {
    expect(normalizeWebsite(' acme.com ')).toBe('https://acme.com');
    expect(normalizeWebsite('http://acme.com')).toBe('http://acme.com');
  });
});

describe('toApplicationInput', () => {
  const target = { orgId: 'acme-org', billingAccountName: 'acme' };

  it('builds the application billing expects', () => {
    expect(toApplicationInput(invoiceValues, target)).toEqual({
      orgId: 'acme-org',
      billingAccountName: 'acme',
      paymentOption: 'Invoice',
      organization: {
        legalName: 'Acme Corporation Ltd',
        type: 'Company',
        website: 'https://acme.com',
      },
      situation: 'We pay vendors by purchase order on net-30 terms.',
      invoice: {
        estimatedMonthlySpend: 'From2500To10000',
        accountsPayableEmail: 'ap@acme.com',
        purchaseOrderNumber: 'PO-4471',
        agreementReference: undefined,
      },
      authorized: true,
    });
  });

  it('leaves the invoice details out when not paying by invoice', () => {
    expect(
      toApplicationInput({ ...invoiceValues, paymentOption: 'NotSure' }, target).invoice
    ).toBeUndefined();
  });
});
