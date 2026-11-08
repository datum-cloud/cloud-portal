import { useBillingAccount, useBillingAccountsForOrgs } from './billing-account.queries';
import { billingAccountKeys } from './billing-account.service';
import type { BillingAccount } from '@/features/billing/types';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const account = (orgId: string, name: string): BillingAccount => ({
  apiVersion: 'billing.miloapis.com/v1alpha1',
  kind: 'BillingAccount',
  metadata: { name, namespace: `organization-${orgId}` },
});

/**
 * Mirrors the seeding the detail page does: only the single-account detail
 * key is seeded, never the cross-org list.
 */
function DetailPageCacheSeed({ orgId, account }: { orgId: string; account: BillingAccount }) {
  useBillingAccount(orgId, account.metadata?.name, {
    initialData: account,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  return null;
}

/** Mirrors the `/account/billing` list page seeding. */
function ListPageCacheSeed({ orgIds, accounts }: { orgIds: string[]; accounts: BillingAccount[] }) {
  useBillingAccountsForOrgs(orgIds, {
    initialData: accounts,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  return null;
}

function renderWithClient(queryClient: QueryClient, node: React.ReactNode) {
  return renderToString(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('billing account cache seeding', () => {
  it('keeps every account in the cross-org list after the detail page seeds first', () => {
    const queryClient = new QueryClient();
    const orgIds = ['org-a'];
    const [first, second] = [account('org-a', 'ba-first'), account('org-a', 'ba-second')];

    // Open the detail page for one account first, then the list page.
    renderWithClient(queryClient, <DetailPageCacheSeed orgId="org-a" account={first} />);
    expect(queryClient.getQueryData(billingAccountKeys.forOrgs(orgIds))).toBeUndefined();

    renderWithClient(queryClient, <ListPageCacheSeed orgIds={orgIds} accounts={[first, second]} />);

    const listed = queryClient.getQueryData<BillingAccount[]>(billingAccountKeys.forOrgs(orgIds));
    expect(listed?.map((item) => item.metadata?.name)).toEqual(['ba-first', 'ba-second']);
  });

  it('does not shrink the cross-org list when the detail page seeds after the list', () => {
    const queryClient = new QueryClient();
    const orgIds = ['org-a'];
    const [first, second] = [account('org-a', 'ba-first'), account('org-a', 'ba-second')];

    renderWithClient(queryClient, <ListPageCacheSeed orgIds={orgIds} accounts={[first, second]} />);
    renderWithClient(queryClient, <DetailPageCacheSeed orgId="org-a" account={first} />);

    const listed = queryClient.getQueryData<BillingAccount[]>(billingAccountKeys.forOrgs(orgIds));
    expect(listed?.map((item) => item.metadata?.name)).toEqual(['ba-first', 'ba-second']);
    expect(
      queryClient.getQueryData<BillingAccount>(billingAccountKeys.detail('org-a', 'ba-first'))
        ?.metadata?.name
    ).toBe('ba-first');
  });
});
