import { routes } from '@/constants/routes';
import { DashboardLayout } from '@/layouts/dashboard/dashboard';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { useApp } from '@/providers/app.provider';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { CustomError } from '@/utils/errorHandle';
import { transformControlPlaneStatus } from '@/utils/misc';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import {
  AreaChartIcon,
  BoltIcon,
  GlobeIcon,
  HomeIcon,
  MapIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { AppLoadContext, Outlet, redirect, useLoaderData } from 'react-router';

export const loader = withMiddleware(async ({ params, context }) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { projectId, orgId } = params;

  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  try {
    if (!projectId || !orgId) {
      throw new CustomError('Project ID and Organization ID are required', 400);
    }

    const project: IProjectControlResponse = await projectsControl.detail(orgId, projectId);

    return project;
  } catch (error) {
    // TODO: temporary solution for handle delay on new project
    // https://github.com/datum-cloud/cloud-portal/issues/45

    if ((error as any).status === 403) {
      return redirect(
        getPathWithParams(`${routes.org.projects.setup}?projectId=${projectId}`, {
          orgId: params.orgId,
        })
      );
    }

    return redirectWithToast(
      getPathWithParams(routes.home, {
        orgId: params.orgId,
      }),
      {
        title: 'Something went wrong',
        description: (error as CustomError).message,
        type: 'error',
      }
    );
  }
}, authMiddleware);

export default function ProjectLayout() {
  const project: IProjectControlResponse = useLoaderData<typeof loader>();
  const { orgId } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const currentStatus = transformControlPlaneStatus(project.status);
    const isReady = currentStatus.status === ControlPlaneStatus.Success;
    const projectId = project.name;

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
        disabled: !isReady,
      },
      {
        title: 'Config',
        href: getPathWithParams(routes.projects.config.root, { orgId, projectId }),
        type: 'collapsible',
        icon: BoltIcon,
        disabled: !isReady,
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
        href: getPathWithParams(routes.projects.connect.networks.root, {
          orgId,
          projectId,
        }),
        type: 'collapsible',
        icon: GlobeIcon,
        disabled: !isReady,
        children: [
          {
            title: 'Networks',
            href: getPathWithParams(routes.projects.connect.networks.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'Gateways',
            href: getPathWithParams(routes.projects.connect.gateways.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'HTTP Routes',
            href: getPathWithParams(routes.projects.connect.httpRoutes.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'Endpoint Slices',
            href: getPathWithParams(routes.projects.connect.endpointSlices.root, {
              orgId,
              projectId,
            }),
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
        disabled: !isReady,
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
        href: getPathWithParams(routes.projects.observe.root, { orgId, projectId }),
        type: 'collapsible',
        icon: AreaChartIcon,
        disabled: !isReady,
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
            title: 'Export Policies',
            href: getPathWithParams(routes.projects.observe.exportPolicies.root, {
              orgId,
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Protect',
        href: getPathWithParams(routes.projects.iam, { orgId, projectId }),
        type: 'collapsible',
        icon: ShieldCheckIcon,
        disabled: !isReady,
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
        disabled: !isReady,
        icon: SettingsIcon,
      },
    ];
  }, [orgId, project]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon" currentProject={project}>
      <Outlet />
    </DashboardLayout>
  );
}
