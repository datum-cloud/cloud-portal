import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet, useLoaderData } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import {
  AreaChartIcon,
  GlobeIcon,
  MapIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from 'lucide-react'
import { withMiddleware } from '@/modules/middleware/middleware'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { useMemo } from 'react'
import { ProjectSwitcher } from '@/layouts/dashboard/header/project-switcher'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { getSession } from '@/modules/auth/auth-session.server'
import { OrganizationModel } from '@/resources/gql/models/organization.model'

export const loader = withMiddleware(async ({ request, params }) => {
  const { projectId } = params
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  const session = await getSession(request.headers.get('Cookie'))
  const org: OrganizationModel = session.get('currentOrg')

  const project: IProjectControlResponse = await projectsControl.getProject(
    org.userEntityID,
    projectId,
    request,
  )
  return { project }
}, authMiddleware)

export default function ProjectLayout() {
  const { project } = useLoaderData<typeof loader>()

  const navItems: NavItem[] = useMemo(() => {
    const { name: projectId } = project

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
  }, [project])
  return (
    <DashboardLayout
      navItems={navItems}
      sidebarHeader={<ProjectSwitcher currentProject={project} />}>
      <Outlet />
    </DashboardLayout>
  )
}
