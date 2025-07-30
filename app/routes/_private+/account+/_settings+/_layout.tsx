import { routes } from '@/constants/routes';
import TabsLayout from '@/layouts/tabs/tabs';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { Outlet } from 'react-router';

export default function AccountSettingsLayout() {
  const navItems: TabsNavProps[] = [
    {
      value: 'preferences',
      label: 'Preferences',
      to: routes.account.preferences,
    },
    {
      value: 'activity',
      label: 'Activity',
      to: routes.account.activity,
    },
  ];
  return (
    <TabsLayout tabsTitle={{ title: 'Account Settings' }} navItems={navItems}>
      <Outlet />
    </TabsLayout>
  );
}
