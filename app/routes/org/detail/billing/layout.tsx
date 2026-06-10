import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Outlet, redirect } from 'react-router';

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
  if (!orgId) {
    throw redirect(paths.account.root);
  }
  const enabled = await isFeatureEnabled(FeatureFlag.Billing, orgId).catch(() => false);
  if (!enabled) {
    throw redirect(getPathWithParams(paths.org.detail.root, { orgId }));
  }
  return null;
};

export default function BillingLayout() {
  return <Outlet />;
}
