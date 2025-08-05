import { paths } from '@/config/paths';
import TabsLayout from '@/layouts/tabs/tabs';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { getPathWithParams } from '@/utils/path';
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
    <TabsLayout tabsTitle={{ title: 'Organization Settings' }} navItems={navItems}>
      <Outlet />
    </TabsLayout>
  );
}
