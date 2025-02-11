import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet, useRouteLoaderData, useParams } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import { FileIcon, SettingsIcon } from 'lucide-react'
import { OrganizationItem } from '@/components/select-organization/organization-item'
import { useApp } from '@/providers/app.provider'
import { useEffect, useMemo } from 'react'
import { getPathWithParams } from '@/utils/path'

export default function OrgLayout() {
  const { orgId } = useParams()
  const { org } = useRouteLoaderData('routes/_main+/$orgId+/_layout')
  const { setOrganization } = useApp()

  useEffect(() => {
    setOrganization(org)
  }, [org])

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Platform',
        href: getPathWithParams(routes.org.root, { orgId }),
        type: 'group',
        children: [
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
        ],
      },
    ]
  }, [orgId])

  return (
    <DashboardLayout
      navItems={navItems}
      headerContent={
        <OrganizationItem org={org!} className="ml-2 max-w-52 md:max-w-none" hideAvatar />
      }
      sidebarCollapsible="icon"
      homeLink={getPathWithParams(routes.org.root, {
        orgId,
      })}>
      <Outlet />
    </DashboardLayout>
  )
}
