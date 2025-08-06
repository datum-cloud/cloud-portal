import { paths } from '@/config/paths';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { DashboardLayout } from '@/layouts/dashboard/dashboard';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { getOrgSession, setOrgSession } from '@/modules/cookie/org.server';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { useApp } from '@/providers/app.provider';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api/organizations/$id';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { AreaChartIcon, HomeIcon, NetworkIcon, SettingsIcon, SquareActivity } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { AppLoadContext, LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router';

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { projectId } = params;

  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  try {
    if (!projectId) {
      throw new CustomError('Project ID is required', 400);
    }

    const project: IProjectControlResponse = await projectsControl.detail(projectId);

    const orgId = project.organizationId;

    if (!orgId) {
      throw new CustomError('Organization ID is required', 400);
    }

    // get org detail
    const res = await fetch(
      `${process.env.APP_URL}${getPathWithParams(ORG_DETAIL_PATH, { id: orgId })}`,
      {
        method: 'GET',
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      }
    );

    const orgData = await res.json();

    if (!orgData.success) {
      throw new CustomError(orgData.error, orgData.status);
    }

    const orgSession = await setOrgSession(request, orgData.data.name);

    return data({ project, org: orgData.data }, { headers: orgSession.headers });
  } catch (error) {
    const orgSession = await getOrgSession(request);

    return redirectWithToast(
      orgSession.orgId
        ? getPathWithParams(paths.org.detail.projects.root, { orgId: orgSession.orgId })
        : paths.account.organizations.root,
      {
        title: 'Something went wrong',
        description: (error as CustomError).message,
        type: 'error',
      }
    );
  }
};

export default function ProjectLayout() {
  const { project, org }: { project: IProjectControlResponse; org: IOrganization } =
    useLoaderData<typeof loader>();

  const { setOrganization } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const currentStatus = transformControlPlaneStatus(project.status);
    const isReady = currentStatus.status === ControlPlaneStatus.Success;
    const projectId = project.name;

    return [
      {
        title: 'Home',
        href: getPathWithParams(paths.project.detail.home, { projectId }),
        type: 'link',
        icon: HomeIcon,
      },
      {
        title: 'Internet edge',
        href: getPathWithParams(paths.project.detail.httpProxy.root, {
          projectId,
        }),
        type: 'collapsible',
        icon: NetworkIcon,
        disabled: !isReady,
        children: [
          {
            title: 'Domains',
            href: getPathWithParams(paths.project.detail.domains.root, {
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'HTTPProxy',
            href: getPathWithParams(paths.project.detail.httpProxy.root, {
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Metrics',
        href: getPathWithParams(paths.project.detail.metrics.root, { projectId }),
        type: 'collapsible',
        icon: AreaChartIcon,
        disabled: !isReady,
        children: [
          {
            title: 'Export policies',
            href: getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Activity',
        href: getPathWithParams(paths.project.detail.activity, { projectId }),
        type: 'link',
        disabled: !isReady,
        icon: SquareActivity,
      },
      {
        title: 'Project settings',
        href: getPathWithParams(paths.project.detail.settings, { projectId }),
        type: 'link',
        disabled: !isReady,
        icon: SettingsIcon,
      },
    ];
  }, [project]);

  useEffect(() => {
    if (org) {
      setOrganization(org);
    }
  }, [org]);

  return (
    <DashboardLayout
      navItems={navItems}
      sidebarCollapsible="icon"
      currentProject={project}
      currentOrg={org}>
      <Outlet />
    </DashboardLayout>
  );
}
