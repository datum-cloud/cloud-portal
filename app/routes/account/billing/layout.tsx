import { MinimalLayout } from '@/layouts';
import { requireOwnedBillingOrgs } from '@/modules/billing/billing-access.server';
import { createOrganizationService } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Billing Accounts</span>,
  path: () => paths.account.billing.root,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Billing Accounts'));

/**
 * Billing accounts belong to orgs, and only an org's owners see its
 * billing. A user who owns none of their orgs has nothing to see here.
 */
export const loader = async () => {
  const organizations = await createOrganizationService().list();
  await requireOwnedBillingOrgs(organizations.items.map((o) => o.name));
  return null;
};

/**
 * Outer chrome for the user-level billing accounts area.
 *
 * Uses `MinimalLayout` (header + content scroller) — the same shell as
 * `routes/account/organizations/layout.tsx`. `DashboardLayout` would
 * give us a sidebar slot we don't need, and its `DashboardContent`
 * opacity transition depends on a `SubLayout` being mounted to flip
 * `hasSubLayout` true — without one the children render under an
 * `opacity-0` wrapper that never animates in.
 *
 * No SubLayout / sub-nav tabs: list ↔ detail isn't a sibling-tab
 * relationship, and each leaf renders its own `<PageTitle>`.
 */
export default function AccountBillingLayout() {
  return (
    <MinimalLayout className="max-w-full px-0 sm:max-w-[1200px]">
      <div className="flex w-full flex-col gap-4">
        <Outlet />
      </div>
    </MinimalLayout>
  );
}
