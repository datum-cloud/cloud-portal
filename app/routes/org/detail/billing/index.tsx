import type { OrgBillingContext } from './layout';
import { toastApiError } from '@/components/error/toast-api-error';
import {
  BillingDetailsCard,
  BillingSection,
  CurrentPeriodCard,
  billingPeriodSummary,
  contractSummary,
  type BillingDetailsValues,
} from '@/features/billing';
import { billingDetailsPatch } from '@/features/billing/billing-details-patch';
import { useOrgUsageDashboard } from '@/modules/billing/usage.queries';
import { usePermission } from '@/modules/rbac';
import { useUpdateBillingAccount } from '@/resources/billing-accounts';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback, useMemo } from 'react';
import { type MetaFunction, Link, useOutletContext } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Billing'));

/**
 * Billing overview: where the account stands this period, and who's billed.
 */
export default function OrgBillingOverviewPage() {
  const { orgId, account, renderedAt } = useOutletContext<OrgBillingContext>();
  const accountName = account.metadata?.name ?? '';
  const namespace = buildOrganizationNamespace(orgId);

  // Every editable field PATCHes the billingaccounts resource. `patch`
  // rather than `update` so a role that can only patch isn't over-gated.
  const { hasPermission: canEditAccount, isLoading: editCheckLoading } = usePermission(
    'billingaccounts',
    'patch',
    { group: 'billing.miloapis.com', namespace, scope: 'org' }
  );

  const contract = useMemo(() => contractSummary(account, renderedAt), [account, renderedAt]);
  const period = useMemo(
    () => billingPeriodSummary(account, contract, renderedAt),
    [account, contract, renderedAt]
  );

  // The usage page's query for the current period, so the two share a cache
  // and agree on the figure.
  const usageQuery = useOrgUsageDashboard(orgId, 'all', 'current', 'organization');
  const usage = usageQuery.data?.usage;

  const detailsMutation = useUpdateBillingAccount({
    onSuccess: () => {
      toast.success('Billing details updated', {
        description: 'Changes show on upcoming invoices.',
      });
    },
    onError: (error) => {
      toastApiError(error, { title: 'Could not update billing details' });
    },
  });

  const handleSaveDetails = useCallback(
    async (values: BillingDetailsValues) => {
      await detailsMutation.mutateAsync({
        orgId,
        name: accountName,
        displayName: values.displayName,
        ...billingDetailsPatch(values),
      });
    },
    [detailsMutation, orgId, accountName]
  );

  return (
    <div className="flex flex-col gap-10">
      <BillingSection
        title="This period"
        description="What this account has spent so far this billing period, and when it's invoiced next.">
        <CurrentPeriodCard
          period={period}
          spend={usage?.status === 'ok' ? usage.spend : undefined}
          spendUnavailable={usageQuery.isError || usage?.spendUnavailable}
          spendLoading={usageQuery.isLoading}
          usageLink={
            <Link
              to={getPathWithParams(paths.org.detail.usage, { orgId })}
              className="text-primary hover:text-primary/80 font-medium">
              See this period&apos;s usage
            </Link>
          }
        />
      </BillingSection>

      <BillingSection
        title="Billing details"
        description="Who's billed and where invoices go. Changes show on upcoming invoices; past invoices aren't affected.">
        <BillingDetailsCard
          account={account}
          canEdit={editCheckLoading ? undefined : canEditAccount}
          isSubmitting={detailsMutation.isPending}
          onSubmit={handleSaveDetails}
        />
      </BillingSection>
    </div>
  );
}
