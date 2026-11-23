import type { OrgBillingContext } from './layout';
import {
  BillingListUnloaded,
  PastInvoicesCard,
  isStaleInvoice,
  toPastInvoiceRow,
  type Invoice,
} from '@/features/billing';
import { requireBillingOwner } from '@/modules/billing/billing-access.server';
import { logger } from '@/modules/logger';
import { createInvoiceService, useInvoices, useInvoicesWatch } from '@/resources/invoices';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { useMemo } from 'react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Invoices</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Invoices'));

/**
 * The org's invoices. Null when they couldn't be read, so the page loads them
 * in the browser rather than saying there are none.
 */
export const loader = async ({ params }: LoaderFunctionArgs): Promise<Invoice[] | null> => {
  const { orgId } = params;
  await requireBillingOwner(orgId);
  return createInvoiceService()
    .list(orgId!)
    .catch((error: unknown) => {
      logger.warn('[org/billing] Could not list invoices', {
        orgId,
        fallback: 'loaded in the browser',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
};

/** The account's past invoices. */
export default function OrgBillingInvoicesPage() {
  const { orgId, account } = useOutletContext<OrgBillingContext>();
  const initialInvoices = useLoaderData<typeof loader>();
  const accountName = account.metadata?.name ?? '';

  const invoicesQuery = useInvoices(orgId, {
    ...(initialInvoices ? { initialData: initialInvoices, initialDataUpdatedAt: Date.now() } : {}),
    staleTime: QUERY_STALE_TIME,
  });
  useInvoicesWatch(orgId);

  const pastInvoices = useMemo(
    () =>
      (invoicesQuery.data ?? [])
        .filter((inv) => inv.spec?.billingAccountRef?.name === accountName && !isStaleInvoice(inv))
        .map(toPastInvoiceRow),
    [invoicesQuery.data, accountName]
  );

  return (
    <div className="flex flex-col gap-4">
      {invoicesQuery.data ? (
        <PastInvoicesCard invoices={pastInvoices} />
      ) : (
        <BillingListUnloaded
          what="invoices"
          isError={invoicesQuery.isError}
          onRetry={() => void invoicesQuery.refetch()}
        />
      )}
    </div>
  );
}
