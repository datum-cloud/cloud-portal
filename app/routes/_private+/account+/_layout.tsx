import { NavItem } from '@/components/sidebar-container/app-sidebar/nav-main';
import { DashboardLayout } from '@/components/sidebar-container/sidebar-container';
import { routes } from '@/constants/routes';
import { Building2Icon, FileIcon, KeyIcon, SettingsIcon } from 'lucide-react';
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
        title: 'Projects',
        href: routes.account.projects,
        type: 'link',
        icon: FileIcon,
      },
      {
        title: 'Account',
        type: 'group',
        href: routes.account.root,
        children: [
          {
            title: 'Settings',
            type: 'link',
            href: routes.account.settings,
            icon: SettingsIcon,
          },
          {
            title: 'API Keys',
            type: 'link',
            href: routes.account.apiKeys.root,
            icon: KeyIcon,
          },
        ],
      },
    ];
  }, []);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  );
}
