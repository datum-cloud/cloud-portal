import type { SubNavigationTab } from '@/components/sub-navigation';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * The billing page's tabs. Each is its own route, so links and the back
 * button work. A selected account (`?account=`, for orgs from before there
 * was one account per org) carries across them.
 */
export function billingTabs(orgId: string, account?: string): SubNavigationTab[] {
  const search = account ? `?account=${encodeURIComponent(account)}` : '';
  const href = (path: string) => `${getPathWithParams(path, { orgId })}${search}`;
  return [
    { label: 'Overview', href: href(paths.org.detail.billing.root) },
    { label: 'Subscriptions & Pricing', href: href(paths.org.detail.billing.subscriptions) },
    { label: 'Invoices', href: href(paths.org.detail.billing.invoices) },
    { label: 'Payment Methods', href: href(paths.org.detail.billing.paymentMethods) },
  ];
}
