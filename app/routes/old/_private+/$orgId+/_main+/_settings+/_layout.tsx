import { paths } from '@/config/paths';
import TabsLayout from '@/layouts/tabs/tabs';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { useApp } from '@/providers/app.provider';
import { getPathWithParams } from '@/utils/path';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function OrgSettingsLayout() {
  const { organization } = useApp();
  const navItems: TabsNavProps[] = useMemo(
    () => [
      {
        value: 'preferences',
        label: 'Preferences',
        to: getPathWithParams(paths.org.detail.settings.preferences, { orgId: organization?.name }),
      },
      {
        value: 'activity',
        label: 'Activity',
        to: getPathWithParams(paths.org.detail.settings.activity, { orgId: organization?.name }),
      },
    ],
    [organization]
  );
  return (
    <TabsLayout tabsTitle={{ title: 'Organization Settings' }} navItems={navItems}>
      <Outlet />
    </TabsLayout>
  );
}
