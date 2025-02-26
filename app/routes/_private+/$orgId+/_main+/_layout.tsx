import { routes } from '@/constants/routes'
import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { getPathWithParams } from '@/utils/path'
import { FileIcon, HomeIcon, SettingsIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Outlet, useParams } from 'react-router'

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
