import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import { Building2Icon, FileIcon, KeyIcon, SettingsIcon } from 'lucide-react'
import { useMemo } from 'react'

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
    ]
  }, [])

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  )
}
