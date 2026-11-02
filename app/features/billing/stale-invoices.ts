import type { Invoice } from './types';

const AMBERFLO_INVOICE_KEY = 'amberflo.billing.miloapis.com/invoiceKey';
const OPENMETER_INVOICE_ID = 'openmeter.miloapis.com/invoiceId';

/**
 * Whether an invoice is a leftover nothing updates any more, so it's hidden
 * from the invoice list:
 *
 * - invoices from Amberflo, the invoicing provider before OpenMeter;
 * - invoices an older OpenMeter provider created for invoices OpenMeter was
 *   still gathering. They're named `<account>-YYYY-MM`; the current provider
 *   adds a hash of the OpenMeter invoice, `<account>-YYYY-MM-<hash>`, and
 *   only creates invoices once OpenMeter issues them.
 *
 * Both stay Open or Past due forever, with made-up totals from test usage.
 */
export const isStaleInvoice = (invoice: Invoice): boolean => {
  const annotations = invoice.metadata?.annotations ?? {};
  if (AMBERFLO_INVOICE_KEY in annotations) return true;
  const account = invoice.spec?.billingAccountRef?.name;
  const name = invoice.metadata?.name ?? '';
  return (
    OPENMETER_INVOICE_ID in annotations &&
    !!account &&
    new RegExp(`^${escapeRegExp(account)}-\\d{4}-\\d{2}$`).test(name)
  );
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
