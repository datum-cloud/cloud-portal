import { BackButton } from '@/components/back-button';
import { DashboardLayout } from '@/layouts/dashboard.layout';
import { paths } from '@/utils/config/paths.config';
import { NavItem } from '@datum-ui/components/sidebar/nav-main';
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
