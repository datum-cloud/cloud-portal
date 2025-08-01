import { DashboardLayout } from '@/components/layout/dashboard';
import { NavItem } from '@/components/layout/dashboard/sidebar/nav-main';
import { routes } from '@/constants/paths';
import { Building2Icon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function AccountLayout() {
  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Organizations',
        href: routes.account.organizations.root,
        type: 'link',
        icon: Building2Icon,
      },
      {
        title: 'Account settings',
        href: routes.account.preferences,
        type: 'link',
        icon: SettingsIcon,
        tabChildLinks: [routes.account.preferences, routes.account.activity],
      },
    ];
  }, []);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  );
}
