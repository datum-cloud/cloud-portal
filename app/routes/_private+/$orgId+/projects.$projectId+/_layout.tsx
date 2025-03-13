import { routes } from '@/constants/routes'
import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { redirectWithToast } from '@/utils/toast.server'
import {
  AreaChartIcon,
  BoltIcon,
  GlobeIcon,
  HomeIcon,
  MapIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { AppLoadContext, Outlet, redirect, useLoaderData, useParams } from 'react-router'

export const loader = withMiddleware(async ({ params, context }) => {
  const { projectsControl, organizationGql } = context as AppLoadContext
  const { projectId, orgId } = params

  try {
    if (!projectId || !orgId) {
      throw new CustomError('Project ID and Organization ID are required', 400)
    }

    const org: OrganizationModel = await organizationGql.getOrganizationDetail(orgId)

    const project: IProjectControlResponse = await projectsControl.detail(
      org.userEntityID,
      projectId,
    )

    // TODO: Temporary Solution to Validate that the project belongs to the current organization
    // The API currently returns project details even if the project belongs to a different org
    // if (project.organizationId !== org.userEntityID) {
    //   throw new CustomError('Project not found', 404)
    // }

    return project
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // TODO: temporary solution for handle delay on new project
    // https://github.com/datum-cloud/cloud-portal/issues/45
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).status === 403) {
      return redirect(
        getPathWithParams(`${routes.org.projects.setup}?projectId=${projectId}`, {
          orgId: params.orgId,
        }),
      )
    }

    return redirectWithToast(
      getPathWithParams(routes.home, {
        orgId: params.orgId,
      }),
      {
        title: 'Something went wrong',
        description: (error as CustomError).message,
        type: 'error',
      },
    )
  }
}, authMiddleware)

export default function ProjectLayout() {
  const { orgId, projectId } = useParams()
  const project = useLoaderData<typeof loader>()

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Dashboard',
        href: getPathWithParams(routes.projects.dashboard, {
          orgId,
          projectId,
        }),
        type: 'link',
        icon: HomeIcon,
      },
      {
        title: 'Locations',
        href: getPathWithParams(routes.projects.locations.root, { orgId, projectId }),
        type: 'link',
        icon: MapIcon,
      },
      {
        title: 'Config',
        href: getPathWithParams(routes.projects.config.root, { orgId, projectId }),
        type: 'collapsible',
        icon: BoltIcon,
        children: [
          {
            title: 'Config Maps',
            href: getPathWithParams(routes.projects.config.configMaps.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'Secrets',
            href: getPathWithParams(routes.projects.config.secrets.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Connect',
        href: getPathWithParams(routes.projects.networks.root, { orgId, projectId }),
        type: 'collapsible',
        icon: GlobeIcon,
        children: [
          {
            title: 'Networks',
            href: getPathWithParams(routes.projects.networks.root, { orgId, projectId }),
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
        href: getPathWithParams(routes.projects.deploy.workloads.root, {
          orgId,
          projectId,
        }),
        type: 'collapsible',
        icon: TerminalIcon,
        children: [
          {
            title: 'Workloads',
            href: getPathWithParams(routes.projects.deploy.workloads.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'Pipelines',
            href: getPathWithParams(routes.projects.deploy.pipelines.root, {
              orgId,
              projectId,
            }),
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
      {
        title: 'Settings',
        href: getPathWithParams(routes.projects.settings, { orgId, projectId }),
        type: 'link',
        icon: SettingsIcon,
      },
    ]
  }, [orgId, projectId])

  return (
    <DashboardLayout
      navItems={navItems}
      sidebarCollapsible="icon"
      currentProject={project}>
      <Outlet />
    </DashboardLayout>
  )
}
