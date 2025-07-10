import { routes } from '@/constants/routes';
import { DashboardLayout } from '@/layouts/dashboard/dashboard';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { useApp } from '@/providers/app.provider';
import { getPathWithParams } from '@/utils/path';
import { FoldersIcon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function OrgLayout() {
  const { organization } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const orgId = organization?.name;
    return [
      /*      {
        title: 'Home',
        href: getPathWithParams(routes.org.root, {
          orgId,
        }),
        type: 'link',
        icon: HomeIcon,
      }, */
      {
        title: 'Projects',
        href: getPathWithParams(routes.org.projects.root, { orgId }),
        type: 'link',
        icon: FoldersIcon,
      },
      {
        title: 'Settings',
        href: getPathWithParams(routes.org.settings.root, { orgId }),
        type: 'link',
        icon: SettingsIcon,
      },
    ];
  }, [organization]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  );
}
