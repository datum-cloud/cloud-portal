import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet, useParams } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import { FileIcon, HomeIcon, SettingsIcon } from 'lucide-react'
import { useMemo } from 'react'
import { getPathWithParams } from '@/utils/path'

export default function OrgLayout() {
  const { orgId } = useParams()

  const navItems: NavItem[] = useMemo(() => {
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
    ]
  }, [orgId])

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon">
      <Outlet />
    </DashboardLayout>
  )
}
