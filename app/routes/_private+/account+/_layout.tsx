import { routes } from '@/constants/routes';
import { DashboardLayout } from '@/layouts/dashboard/dashboard';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { Building2Icon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function AccountLayout() {
  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Your Organizations',
        href: routes.account.organizations.root,
        type: 'link',
        icon: Building2Icon,
      },
      {
        title: 'Account Settings',
        href: routes.account.settings,
        type: 'link',
        icon: SettingsIcon,
      },
    ];
  }, []);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  );
}
