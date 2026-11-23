import type { ContractSummary, ScheduledCharge } from './contract';
import type { BillingAccount } from './types';
import {
  buildBillingCycleWindows,
  cycleTerms,
  nextCycleStart,
} from '@/modules/billing/billing-cycle';

/** The invoice the account gets next, as far as the portal can tell. */
export interface NextInvoice {
  date: string;
  /** When it's due, when the contract's payment terms say. */
  dueDate?: string;
  /** The contract's fixed charges on it; none for usage alone. */
  charges: ScheduledCharge[];
  /** The fixed charges' total, formatted. Unset when there are none. */
  total?: string;
  /** Whether usage is billed on it. */
  billsUsage: boolean;
}

/** The billing period the account is in and the invoice that ends it. */
export interface BillingPeriodSummary {
  /** Start of the current period (inclusive), as an ISO date. */
  start: string;
  /** End of the current period (exclusive), when the next one starts. */
  end: string;
  nextInvoice: NextInvoice;
}

/**
 * The current billing period and the next invoice, for the billing overview.
 *
 * The period follows the same terms as the usage page (see `cycleTerms`), so
 * the two agree. A contract knows its next invoice and its fees, so it's used
 * when it bills by the end of the period, or whenever it has started (it then
 * sets the period). Otherwise the next invoice is the period's usage, at its
 * end.
 */
export function billingPeriodSummary(
  account: BillingAccount,
  contract: ContractSummary | undefined,
  now = Date.now()
): BillingPeriodSummary {
  const at = new Date(now);
  const terms = cycleTerms(account, at);
  const [current] = buildBillingCycleWindows(terms, at);
  const end = nextCycleStart(terms, at);

  const contractNext = contract?.upcomingInvoices[0];
  const useContract =
    contractNext !== undefined &&
    (contract?.started || Date.parse(contractNext.date) <= end.getTime());

  return {
    start: new Date(current.startSec * 1000).toISOString(),
    end: end.toISOString(),
    nextInvoice: useContract
      ? {
          date: contractNext.date,
          dueDate: contractNext.dueDate,
          charges: contractNext.charges,
          total: contractNext.charges.length > 0 ? contractNext.total : undefined,
          billsUsage: contractNext.billsUsage,
        }
      : { date: end.toISOString(), charges: [], billsUsage: true },
  };
}
