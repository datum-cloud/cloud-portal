import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet, useParams } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import {
  AreaChartIcon,
  GlobeIcon,
  MapIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from 'lucide-react'

import { useMemo } from 'react'
import { ProjectSwitcher } from '@/layouts/dashboard/header/project-switcher'
export default function ProjectLayout() {
  const { projectId } = useParams()
  const navItems: NavItem[] = useMemo(() => {
    if (!projectId) return []
    return [
      {
        title: 'Platform',
        href: routes.projects.root,
        type: 'group',
        children: [
          {
            title: 'Locations',
            href: routes.projects.locations(projectId),
            type: 'link',
            icon: MapIcon,
          },
          {
            title: 'Connect',
            href: routes.projects.locations(projectId),
            type: 'collapsible',
            icon: GlobeIcon,
            children: [
              {
                title: 'Networks',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Gateways',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Services',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
            ],
          },
          {
            title: 'Deploy',
            href: routes.projects.locations(projectId),
            type: 'collapsible',
            icon: TerminalIcon,
            children: [
              {
                title: 'Workloads',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Pipelines',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
            ],
          },
          {
            title: 'Observe',
            href: routes.projects.locations(projectId),
            type: 'collapsible',
            icon: AreaChartIcon,
            children: [
              {
                title: 'Metrics',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Logs',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Traces',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Exporters',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
            ],
          },
          {
            title: 'Protect',
            href: routes.projects.locations(projectId),
            type: 'collapsible',
            icon: ShieldCheckIcon,
            children: [
              {
                title: 'IAM Policies',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Roles',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
              {
                title: 'Service Accounts',
                href: routes.projects.locations(projectId),
                type: 'link',
              },
            ],
          },
        ],
      },
    ]
  }, [projectId])
  return (
    <DashboardLayout navItems={navItems} sidebarHeader={<ProjectSwitcher />}>
      <Outlet />
    </DashboardLayout>
  )
}
