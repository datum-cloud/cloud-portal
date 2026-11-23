import {
  billingTabs,
  getBillingAccountDisplayName,
  selectDefaultOrgBillingAccount,
  type BillingAccount,
} from '@/features/billing';
import { SubLayout } from '@/layouts';
import { requireBillingOwner } from '@/modules/billing/billing-access.server';
import {
  createBillingAccountService,
  useBillingAccounts,
  useBillingAccountsWatch,
} from '@/resources/billing-accounts';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { useMemo } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, Outlet, redirect, useLoaderData, useLocation } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Billing</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Billing');
});

/** What every billing tab gets from the layout, through the outlet. */
export interface OrgBillingContext {
  orgId: string;
  /** The account the page shows, kept fresh by the watch. */
  account: BillingAccount;
  /** When the loader ran, so server and browser agree on dates. */
  renderedAt: number;
}

interface LoaderData {
  orgId: string;
  account: BillingAccount;
  accounts: BillingAccount[];
  /**
   * An account a link asked for (`?account=`) that the org doesn't have, so
   * the page says it's showing another one.
   */
  missingAccount: string | undefined;
  renderedAt: number;
}

/** The org's accounts that aren't being deleted. */
function liveAccounts(accounts: BillingAccount[]): BillingAccount[] {
  return accounts.filter((a) => !a.metadata?.deletionTimestamp);
}

/**
 * The organization's billing account, in tabs.
 *
 * Each org has one billing account, so the page is that account. Only the
 * org's owners reach it; everyone else lands back on the org overview rather
 * than seeing a 404. An org that hasn't set billing up yet goes to the
 * billing step of setup instead.
 *
 * An org with more than one account, from before there was one per org,
 * shows its default account and links to the others (`?account=`). The
 * selection carries across the tabs.
 */
export const loader = async ({ params, request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const { orgId } = params;
  await requireBillingOwner(orgId);
  if (!orgId) throw redirect(paths.account.root);

  const accounts = await createBillingAccountService().list(orgId);
  const requested = new URL(request.url).searchParams.get('account') ?? undefined;
  const account =
    liveAccounts(accounts).find((a) => a.metadata?.name === requested) ??
    selectDefaultOrgBillingAccount(accounts);
  if (!account?.metadata?.name) {
    throw redirect(`${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`);
  }

  return {
    orgId,
    account,
    accounts,
    missingAccount: requested && requested !== account.metadata.name ? requested : undefined,
    renderedAt: Date.now(),
  };
};

export default function BillingLayout() {
  const {
    orgId,
    account: initialAccount,
    accounts: initialAccounts,
    missingAccount,
    renderedAt,
  } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const accountName = initialAccount.metadata?.name ?? '';

  // A live cache seeded by the loader; the watch keeps it fresh.
  const accountsQuery = useBillingAccounts(orgId, {
    initialData: initialAccounts,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  useBillingAccountsWatch(orgId);

  const accounts = accountsQuery.data ?? initialAccounts;
  const account = accounts.find((a) => a.metadata?.name === accountName) ?? initialAccount;
  const otherAccounts = liveAccounts(accounts).filter((a) => a.metadata?.name !== accountName);

  // Carry the account across tabs only when the org has a choice of them.
  const selected = otherAccounts.length > 0 ? accountName : undefined;
  const navItems = useMemo(() => billingTabs(orgId, selected), [orgId, selected]);
  const context = useMemo<OrgBillingContext>(
    () => ({ orgId, account, renderedAt }),
    [orgId, account, renderedAt]
  );

  return (
    <SubLayout title="Billing" status={getBillingAccountDisplayName(account)} navItems={navItems}>
      <div className="flex w-full flex-col gap-6">
        {missingAccount || otherAccounts.length > 0 ? (
          <Alert variant="info" data-e2e="billing-other-accounts">
            <AlertTitle className="text-sm">
              {missingAccount
                ? `This organization has no billing account named ${missingAccount}`
                : `This organization has ${otherAccounts.length + 1} billing accounts`}
            </AlertTitle>
            <AlertDescription>
              <span>
                This page shows {getBillingAccountDisplayName(account)}.
                {otherAccounts.length > 0 ? ' Also on this organization: ' : null}
                {otherAccounts.map((other, index) => (
                  <span key={other.metadata?.name}>
                    {index > 0 ? ', ' : null}
                    <Link
                      // Another account, on the same tab.
                      to={`${pathname}?account=${encodeURIComponent(other.metadata?.name ?? '')}`}
                      className="text-primary hover:text-primary/80 font-medium">
                      {getBillingAccountDisplayName(other)}
                    </Link>
                  </span>
                ))}
                {otherAccounts.length > 0 ? '.' : null}
              </span>
            </AlertDescription>
          </Alert>
        ) : null}
        <Outlet context={context} />
      </div>
    </SubLayout>
  );
}
