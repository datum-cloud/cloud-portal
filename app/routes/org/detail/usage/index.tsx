import { UsageDashboard } from '@/features/usage';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, data, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Usage'));

export const handle = {
  breadcrumb: () => <span>Usage</span>,
};

/**
 * Org-wide usage dashboard.
 *
 * Usage data, billing cycle windows, and Amberflo series load client-side
 * via React Query so filter changes don't block the route transition.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw data('Organization is required', { status: 400 });
  }

  return null;
};

export default function OrgUsagePage() {
  const { orgId } = useParams();

  if (!orgId) return null;

  return <UsageDashboard orgId={orgId} orgLabel={orgId} />;
}
