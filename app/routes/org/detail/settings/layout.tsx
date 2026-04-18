import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import type { Organization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { useMemo } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Organization Settings</span>,
  path: (data: Organization) =>
    getPathWithParams(paths.org.detail.settings.general, { orgId: data?.name }),
};

export default function OrgSettingsLayout() {
  const org = useRouteLoaderData<Organization>('org-detail');

  const navItems: SubNavigationTab[] = useMemo(() => {
    const orgId = org?.name;
    return [
      {
        label: 'General',
        href: getPathWithParams(paths.org.detail.settings.general, { orgId }),
      },
      /* {
        label: 'Policy bindings',
        href: getPathWithParams(paths.org.detail.policyBindings.root, { orgId }),
        hidden: org?.type === 'Personal',
      }, */
      /* {
        label: 'Notifications',
        href: getPathWithParams(paths.org.detail.settings.notifications, { orgId }),
      }, */
      {
        label: 'Quotas',
        href: getPathWithParams(paths.org.detail.settings.quotas, { orgId }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.org.detail.settings.activity, { orgId }),
      },
    ];
  }, [org]);

  return (
    <div className="flex h-full flex-1 flex-col gap-8">
      <PageTitle title="Organization Settings" />
      <SubNavigationTabs tabs={navItems} />
      <div className="h-full w-full pt-2">
        <div className="flex h-full flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
