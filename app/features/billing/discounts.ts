/**
 * Projection helpers for the discounts applied to a billing account.
 *
 * Staff set discounts on billing Offers, which customers can't read. Billing
 * copies each service's resolved percentage onto
 * `BillingAccount.status.discounts`, so nothing here knows which Offer a
 * discount came from or how staff configured it.
 */
import type { BillingAccount } from './types';

/** A service's resolved discount, as a percentage from 0 to 100. */
export interface AccountDiscount {
  serviceDisplayName: string;
  percentage: number;
}

/**
 * The discounts billing publishes on the account's status, labelled by each
 * pricing's display name. Empty when the account has no discount.
 */
export function accountDiscounts(account: BillingAccount | undefined): AccountDiscount[] {
  return (account?.status?.discounts ?? []).map((d) => ({
    serviceDisplayName: d.displayName || d.name,
    percentage: d.percentage,
  }));
}

export type DiscountsSummary =
  { kind: 'uniform'; percentage: number } | { kind: 'perService'; items: AccountDiscount[] };

/**
 * Summarize the discounts worth showing: `uniform` when every service has the
 * same percentage, otherwise the discounted services sorted by name.
 * Undefined when no service has a discount above 0%.
 */
export function summarizeDiscounts(
  discounts: readonly AccountDiscount[]
): DiscountsSummary | undefined {
  const discounted = discounts.filter((d) => d.percentage > 0);
  const first = discounted[0];
  if (!first) return undefined;

  if (discounts.every((d) => d.percentage === first.percentage)) {
    return { kind: 'uniform', percentage: first.percentage };
  }

  return {
    kind: 'perService',
    items: [...discounted].sort((a, b) => a.serviceDisplayName.localeCompare(b.serviceDisplayName)),
  };
}

/** Format a percentage for display, e.g. `20` → "20%", `12.5` → "12.5%". */
export function formatDiscountPercentage(percentage: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(percentage)}%`;
}
