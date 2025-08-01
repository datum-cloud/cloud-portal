import { DashboardLayout } from '@/components/layout/dashboard';
import { NavItem } from '@/components/layout/dashboard/sidebar/nav-main';
import { routes } from '@/constants/paths';
import { useApp } from '@/providers/app.provider';
import { getPathWithParams } from '@/utils/path';
import { FoldersIcon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export default function OrgLayout() {
  const { organization } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const orgId = organization?.name;
    const settingsRoot = getPathWithParams(routes.org.settings.root, { orgId });
    const settingsActivity = getPathWithParams(routes.org.settings.activity, { orgId });

    return [
      {
        title: 'Projects',
        href: getPathWithParams(routes.org.projects.root, { orgId }),
        type: 'link',
        icon: FoldersIcon,
      },
      {
        title: 'Organization settings',
        href: settingsRoot,
        type: 'link',
        icon: SettingsIcon,
        tabChildLinks: [settingsRoot, settingsActivity],
      },
    ];
  }, [organization]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  );
}
