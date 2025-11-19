import TabsLayout from '@/layouts/tabs/tabs.layout';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Organization Settings</span>,
  path: (data: IOrganization) =>
    getPathWithParams(paths.org.detail.settings.preferences, { orgId: data?.name }),
};

export default function OrgSettingsLayout() {
  const org = useRouteLoaderData<IOrganization>('org-detail');

  const navItems: TabsNavProps[] = useMemo(() => {
    const orgId = org?.name;
    return [
      {
        value: 'preferences',
        label: 'Preferences',
        to: getPathWithParams(paths.org.detail.settings.preferences, { orgId }),
      },
      /* {
        value: 'policy-bindings',
        label: 'Policy bindings',
        to: getPathWithParams(paths.org.detail.policyBindings.root, { orgId }),
        hidden: org?.type === OrganizationType.Personal,
      }, */
      // {
      //   value: 'quotas',
      //   label: 'Quotas',
      //   to: getPathWithParams(paths.org.detail.settings.quotas, { orgId }),
      // },
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
