import { BackButton } from '@/components/back-button';
import { DashboardLayout } from '@/layouts/dashboard/dashboard.layout';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { paths } from '@/utils/config/paths.config';
import { Outlet } from 'react-router';

export default function AccountSettingsLayout() {
  const navItems: NavItem[] = [
    {
      href: paths.account.preferences,
      title: 'Preferences',
      type: 'link',
    },
    {
      href: paths.account.activity,
      title: 'Activity',
      type: 'link',
    },
  ];
  return (
    <DashboardLayout
      navItems={navItems}
      sidebarCollapsible="offcanvas"
      containerClassName="max-w-4xl"
      sidebarHeader={<BackButton />}>
      <Outlet />
    </DashboardLayout>
  );
}
