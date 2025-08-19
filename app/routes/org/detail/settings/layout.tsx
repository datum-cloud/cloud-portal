import TabsLayout from '@/layouts/tabs/tabs';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useParams } from 'react-router';

export default function OrgSettingsLayout() {
  const { orgId } = useParams();
  const navItems: TabsNavProps[] = useMemo(
    () => [
      {
        value: 'preferences',
        label: 'Preferences',
        to: getPathWithParams(paths.org.detail.settings.preferences, { orgId }),
      },
      {
        value: 'activity',
        label: 'Activity',
        to: getPathWithParams(paths.org.detail.settings.activity, { orgId }),
      },
    ],
    [orgId]
  );
  return (
    <TabsLayout
      tabsTitle={{ title: 'Organization Settings' }}
      navItems={navItems}
      containerClassName="max-w-3xl">
      <Outlet />
    </TabsLayout>
  );
}
