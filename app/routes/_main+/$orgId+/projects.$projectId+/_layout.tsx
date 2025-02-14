import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { Outlet, useLoaderData, useParams, redirect, AppLoadContext } from 'react-router'
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
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { getSession } from '@/modules/auth/auth-session.server'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ request, params, context }) => {
  const { projectsControl } = context as AppLoadContext
  const { projectId } = params

  try {
    const session = await getSession(request.headers.get('Cookie'))
    const orgEntityId: string = session.get('currentOrgEntityID')

    if (!projectId) {
      throw new Response('Project ID is required', { status: 400 })
    }

    const project: IProjectControlResponse = await projectsControl.getProject(
      orgEntityId,
      projectId,
    )

    return project
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // TODO: temporary solution for handle delay on new project
    // https://github.com/datum-cloud/cloud-portal/issues/45
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).status === 403) {
      return redirect(
        getPathWithParams(`${routes.projects.setup}?projectId=${projectId}`, {
          orgId: params.orgId,
        }),
      )
    }
    return null
  }
}, authMiddleware)

export default function ProjectLayout() {
  const { orgId, projectId } = useParams()
  const project = useLoaderData<typeof loader>()

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Locations',
        href: getPathWithParams(routes.projects.locations, { orgId, projectId }),
        type: 'link',
        icon: MapIcon,
      },
      {
        title: 'Connect',
        href: getPathWithParams(routes.projects.networks, { orgId, projectId }),
        type: 'collapsible',
        icon: GlobeIcon,
        children: [
          {
            title: 'Networks',
            href: getPathWithParams(routes.projects.networks, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Gateways',
            href: getPathWithParams(routes.projects.gateways, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Services',
            href: getPathWithParams(routes.projects.services, { orgId, projectId }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Deploy',
        href: getPathWithParams(routes.projects.workloads, { orgId, projectId }),
        type: 'collapsible',
        icon: TerminalIcon,
        children: [
          {
            title: 'Workloads',
            href: getPathWithParams(routes.projects.workloads, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Pipelines',
            href: getPathWithParams(routes.projects.pipelines, { orgId, projectId }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Observe',
        href: getPathWithParams(routes.projects.metrics, { orgId, projectId }),
        type: 'collapsible',
        icon: AreaChartIcon,
        children: [
          {
            title: 'Metrics',
            href: getPathWithParams(routes.projects.metrics, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Logs',
            href: getPathWithParams(routes.projects.logs, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Traces',
            href: getPathWithParams(routes.projects.traces, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Exporters',
            href: getPathWithParams(routes.projects.exporters, { orgId, projectId }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Protect',
        href: getPathWithParams(routes.projects.iam, { orgId, projectId }),
        type: 'collapsible',
        icon: ShieldCheckIcon,
        children: [
          {
            title: 'IAM Policies',
            href: getPathWithParams(routes.projects.iam, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Roles',
            href: getPathWithParams(routes.projects.roles, { orgId, projectId }),
            type: 'link',
          },
          {
            title: 'Service Accounts',
            href: getPathWithParams(routes.projects.serviceAccounts, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
        ],
      },
    ]
  }, [orgId, projectId])

  return (
    <DashboardLayout
      navItems={navItems}
      sidebarHeader={
        <ProjectSwitcher orgId={orgId!} currentProject={project} className="mt-2" />
      }
      sidebarCollapsible="icon"
      homeLink={getPathWithParams(routes.projects.dashboard, {
        orgId,
        projectId: (project as IProjectControlResponse)?.name,
      })}>
      <Outlet />
    </DashboardLayout>
  )
}
