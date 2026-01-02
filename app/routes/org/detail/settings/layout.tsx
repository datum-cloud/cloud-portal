import TabsLayout from '@/layouts/tabs/tabs.layout';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import type { Organization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Organization Settings</span>,
  path: (data: Organization) =>
    getPathWithParams(paths.org.detail.settings.general, { orgId: data?.name }),
};

export default function OrgSettingsLayout() {
  const org = useRouteLoaderData<Organization>('org-detail');

  const navItems: TabsNavProps[] = useMemo(() => {
    const orgId = org?.name;
    return [
      {
        value: 'general',
        label: 'General',
        to: getPathWithParams(paths.org.detail.settings.general, { orgId }),
      },
      /* {
        value: 'policy-bindings',
        label: 'Policy bindings',
        to: getPathWithParams(paths.org.detail.policyBindings.root, { orgId }),
        hidden: org?.type === 'Personal',
      }, */
      {
        value: 'quotas',
        label: 'Quotas',
        to: getPathWithParams(paths.org.detail.settings.quotas, { orgId }),
      },
      {
        value: 'activity',
        label: 'Activity',
        to: getPathWithParams(paths.org.detail.settings.activity, { orgId }),
      },
    ];
  }, [org]);
  return (
    <TabsLayout tabsTitle={{ title: 'Organization Settings' }} navItems={navItems}>
      <Outlet />
    </TabsLayout>
  );
}
