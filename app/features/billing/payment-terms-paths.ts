import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Where the customer started applying for payment terms. It decides where
 * "Add a card instead" and "Back" lead, and how the status pages read:
 *   - `onboarding`: a new user on the payment step of onboarding
 *   - `create`: an existing user adding another org from the organizations
 *     page, before it has a card or any projects
 *   - `setup`: an owner finishing setup of an existing org (the default,
 *     and where the setup gate sends owners later)
 *   - `settings`: a customer who already pays by card, from billing settings
 */
export type PaymentTermsEntry = 'onboarding' | 'create' | 'setup' | 'settings';

export interface PaymentTermsSearch {
  orgId?: string;
  /** Billing account to apply for; the org's default account when unset. */
  billingAccountName?: string;
  entry: PaymentTermsEntry;
  /** Show the form even when a declined application exists ("Apply again"). */
  apply: boolean;
}

const ENTRIES: PaymentTermsEntry[] = ['onboarding', 'create', 'setup', 'settings'];

/** Whether the org is brand new: no card, and no projects until it's approved. */
export function isNewOrgEntry(entry: PaymentTermsEntry): boolean {
  return entry === 'onboarding' || entry === 'create';
}

export function readPaymentTermsSearch(url: URL): PaymentTermsSearch {
  const from = url.searchParams.get('from');
  return {
    orgId: url.searchParams.get('orgId')?.trim() || undefined,
    billingAccountName: url.searchParams.get('account')?.trim() || undefined,
    entry: ENTRIES.includes(from as PaymentTermsEntry) ? (from as PaymentTermsEntry) : 'setup',
    apply: url.searchParams.get('apply') === '1',
  };
}

/** The payment terms page: the form, or the application's status. */
export function paymentTermsPath(search: Partial<PaymentTermsSearch> & { orgId: string }): string {
  const params = new URLSearchParams({ orgId: search.orgId });
  if (search.billingAccountName) params.set('account', search.billingAccountName);
  if (search.entry && search.entry !== 'setup') params.set('from', search.entry);
  if (search.apply) params.set('apply', '1');
  return `${paths.onboarding.paymentTerms}?${params.toString()}`;
}

/**
 * Where "Add a card" leads from the payment terms pages. `method=card` keeps
 * the billing step from sending the owner straight back to a declined
 * application.
 */
export function cardSetupPath(
  search: Pick<PaymentTermsSearch, 'entry' | 'billingAccountName'> & { orgId: string }
): string {
  if (search.entry === 'settings' && search.billingAccountName) {
    return billingSettingsPath(search.billingAccountName);
  }
  const params = new URLSearchParams({ method: 'card' });
  // New users finish onboarding on the billing step without an org id; with
  // one, the step reads as finishing an existing org's setup.
  if (search.entry !== 'onboarding') params.set('orgId', search.orgId);
  return `${paths.onboarding.billing}?${params.toString()}`;
}

/** The billing account's settings page. */
export function billingSettingsPath(billingAccountName: string): string {
  return getPathWithParams(paths.account.billing.detail.root, {
    billingAccountId: billingAccountName,
  });
}
