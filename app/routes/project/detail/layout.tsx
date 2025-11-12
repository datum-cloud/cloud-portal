import { DashboardLayout } from '@/layouts/dashboard/dashboard.layout';
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main';
import { useApp } from '@/providers/app.provider';
import { createProjectsControl } from '@/resources/control-plane';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse, ICachedProject } from '@/resources/interfaces/project.interface';
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api/organizations/$id';
import { paths } from '@/utils/config/paths.config';
import { getOrgSession, redirectWithToast, setOrgSession } from '@/utils/cookies';
import { BadRequestError, ValidationError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import { AreaChartIcon, FolderDot, HomeIcon, NetworkIcon, SettingsIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { AppLoadContext, LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router';

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const { projectId } = params;

  const projectsControl = createProjectsControl(controlPlaneClient as Client);
  try {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    const project: IProjectControlResponse = await projectsControl.detail(projectId);

    if (!project.name) {
      throw new BadRequestError('Project not found');
    }

    const orgId = project.organizationId;

    // Check cache for deletion status
    const cachedProjects = (await cache.getItem(`projects:${orgId}`)) as ICachedProject[] | null;
    const cachedProject = cachedProjects?.find((p) => p.name === projectId);

    // Block access if project is marked as deleting
    if (cachedProject?._meta?.status === 'deleting') {
      throw new BadRequestError(
        'This project is being deleted and is no longer accessible. Please wait for the deletion to complete.'
      );
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

    if (!res.ok) {
      throw new BadRequestError('Failed to load organization');
    }

    const orgData = await res.json();

    const orgSession = await setOrgSession(request, orgData.data.name);

    return data({ project, org: orgData.data }, { headers: orgSession.headers });
  } catch (error: any) {
    const orgSession = await getOrgSession(request);

    return redirectWithToast(
      orgSession.orgId
        ? getPathWithParams(paths.org.detail.projects.root, { orgId: orgSession.orgId })
        : paths.account.organizations.root,
      {
        title: 'Project unavailable',
        description: error.message,
        type: 'error',
      }
    );
  }
};

export default function ProjectLayout() {
  const { project, org }: { project: IProjectControlResponse; org: IOrganization } =
    useLoaderData<typeof loader>();

  const { setOrganization, setProject } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const currentStatus = transformControlPlaneStatus(project.status);
    const isReady = currentStatus.status === ControlPlaneStatus.Success;
    const projectId = project.name;

    const settingsPreferences = getPathWithParams(paths.project.detail.settings.preferences, {
      projectId,
    });
    const settingsActivity = getPathWithParams(paths.project.detail.settings.activity, {
      projectId,
    });
    const settingsQuotas = getPathWithParams(paths.project.detail.settings.quotas, { projectId });

    return [
      {
        title: 'Home',
        href: getPathWithParams(paths.project.detail.home, { projectId }),
        type: 'link',
        icon: HomeIcon,
      },
      {
        title: 'Runtime',
        href: getPathWithParams(paths.project.detail.httpProxy.root, {
          projectId,
        }),
        type: 'collapsible',
        icon: NetworkIcon,
        disabled: !isReady,
        children: [
          {
            title: 'DNS',
            href: getPathWithParams(paths.project.detail.dnsZones.root, {
              projectId,
            }),
            type: 'link',
          },
          {
            title: 'Proxy',
            href: getPathWithParams(paths.project.detail.httpProxy.root, {
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Workflows',
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
        title: 'Assets',
        href: getPathWithParams(paths.project.detail.config.root, {
          projectId,
        }),
        type: 'collapsible',
        icon: FolderDot,
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
            title: 'Secrets',
            href: getPathWithParams(paths.project.detail.config.secrets.root, {
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Project Settings',
        href: getPathWithParams(paths.project.detail.settings.preferences, { projectId }),
        type: 'link',
        disabled: !isReady,
        icon: SettingsIcon,
        tabChildLinks: [settingsPreferences, settingsActivity, settingsQuotas],
      },
    ];
  }, [project]);

  useEffect(() => {
    if (org) {
      setOrganization(org);
    }
  }, [org]);

  useEffect(() => {
    if (project) {
      setProject(project);
    }
  }, [project]);

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
