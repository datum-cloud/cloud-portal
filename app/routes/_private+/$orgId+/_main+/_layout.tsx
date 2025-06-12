import { NavItem } from '@/components/sidebar-container/app-sidebar/nav-main';
import { DashboardLayout } from '@/components/sidebar-container/sidebar-container';
import { routes } from '@/constants/routes';
import { useApp } from '@/providers/app.provider';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { FileIcon, HomeIcon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function OrgLayout() {
  const { organization } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const orgId = organization?.id;
    return [
      {
        title: 'Home',
        href: getPathWithParams(routes.org.root, {
          orgId,
        }),
        type: 'link',
        icon: HomeIcon,
      },
      {
        title: 'Projects',
        href: getPathWithParams(routes.org.projects.root, { orgId }),
        type: 'link',
        icon: FileIcon,
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
