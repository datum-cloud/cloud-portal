import { NavItem } from '@/components/sidebar-container/app-sidebar/nav-main';
import { SidebarContainer } from '@/components/sidebar-container/sidebar-container';
import { routes } from '@/constants/routes';
import { useApp } from '@/providers/app.provider';
import { organizationCookie } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers';
import { FileIcon, HomeIcon, SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { LoaderFunctionArgs, Outlet, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const org = await organizationCookie.get(request);

  if (!org) {
    return redirect(routes.account.organizations.root);
  }

  return null;
}

export default function OrganizationLayout() {
  const { organization } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const orgId = organization?.id;
    return [
      {
        title: 'Home',
        href: getPathWithParams(routes.org.dashboard, {
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
    <SidebarContainer navItems={navItems}>
      <Outlet />
    </SidebarContainer>
  );
}
