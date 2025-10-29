import TabsLayout from '@/layouts/tabs/tabs.layout';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { paths } from '@/utils/config/paths.config';
import { Outlet } from 'react-router';

export default function AccountSettingsLayout() {
  const navItems: TabsNavProps[] = [
    {
      value: 'preferences',
      label: 'Preferences',
      to: paths.account.preferences,
    },
    {
      value: 'activity',
      label: 'Activity',
      to: paths.account.activity,
    },
  ];
  return (
    <TabsLayout
      tabsTitle={{ title: 'Account Settings' }}
      navItems={navItems}
      containerClassName="max-w-3xl">
      <Outlet />
    </TabsLayout>
  );
}
