import { requireBillingOwner } from '@/modules/billing/billing-access.server';
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
 * Only the org's owners see its billing. Everyone else lands back on the
 * org overview rather than seeing a 404.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  await requireBillingOwner(params.orgId);
  return null;
};

export default function BillingLayout() {
  return <Outlet />;
}
