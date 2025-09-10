import { DashboardLayout } from '@/layouts/dashboard/dashboard';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { paths } from '@/utils/config/paths.config';
import { Building2Icon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function AccountLayout() {
  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Organizations',
        href: paths.account.organizations.root,
        type: 'link',
        icon: Building2Icon,
      },
      {
        title: 'Account settings',
        href: paths.account.preferences,
        type: 'link',
        icon: SettingsIcon,
        tabChildLinks: [paths.account.preferences, paths.account.activity],
      },
    ];
  }, []);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  );
}
