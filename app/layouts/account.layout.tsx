import { NavItem } from '@/components/sidebar-container/app-sidebar/nav-main';
import { SidebarContainer } from '@/components/sidebar-container/sidebar-container';
import { routes } from '@/constants/routes';
import { Building2Icon, FileIcon, SettingsIcon, KeyIcon } from 'lucide-react';
import { Outlet } from 'react-router';

const navItems: NavItem[] = [
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
    title: 'Settings',
    href: routes.account.root,
    type: 'link',
    icon: SettingsIcon,
  },
];

export default function AccountLayout() {
  return (
    <SidebarContainer navItems={navItems}>
      <Outlet />
    </SidebarContainer>
  );
}
