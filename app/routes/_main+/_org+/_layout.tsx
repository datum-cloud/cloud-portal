import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import { FileIcon, SettingsIcon } from 'lucide-react'
import { OrganizationItem } from '@/components/select-organization/organization-item'
import { useApp } from '@/providers/app.provider'

const navItems: NavItem[] = [
  {
    title: 'Platform',
    href: routes.projects.root,
    type: 'group',
    children: [
      {
        title: 'Projects',
        href: routes.projects.root,
        type: 'link',
        icon: FileIcon,
      },
      {
        title: 'Settings',
        href: routes.org.settings.root,
        type: 'link',
        icon: SettingsIcon,
      },
    ],
  },
]
export default function OrgLayout() {
  const { organization } = useApp()
  return (
    <DashboardLayout
      navItems={navItems}
      headerContent={
        <OrganizationItem org={organization!} className="max-w-52 md:max-w-none" />
      }
      sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  )
}
