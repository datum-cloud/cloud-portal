import { requireBillingForOrg } from '@/modules/feature-flags/billing-gate.server';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Billing</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Billing');
});

/**
 * Gate the org-scoped billing section behind the Billing feature flag.
 * Closed-by-default if the eval fails — a broken evaluator must never
 * silently expose pages. Disabled orgs land back on the org overview
 * rather than seeing a 404.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const orgId = params.orgId;
  await requireBillingForOrg(orgId);
  return null;
};

export default function BillingLayout() {
  return <Outlet />;
}
