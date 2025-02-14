import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet, useRouteLoaderData, useParams } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import { FileIcon, SettingsIcon } from 'lucide-react'
import { OrganizationItem } from '@/components/select-organization/organization-item'
import { useMemo } from 'react'
import { getPathWithParams } from '@/utils/path'

export default function OrgLayout() {
  const { orgId } = useParams()
  const { org } = useRouteLoaderData('routes/_main+/$orgId+/_layout')

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Projects',
        href: getPathWithParams(routes.projects.root, { orgId }),
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
    <DashboardLayout
      navItems={navItems}
      headerContent={
        <OrganizationItem org={org!} hideAvatar className="ml-2 mr-4 hidden sm:flex" />
      }
      sidebarCollapsible="icon"
      homeLink={getPathWithParams(routes.org.root, {
        orgId,
      })}>
      <Outlet />
    </DashboardLayout>
  )
}
