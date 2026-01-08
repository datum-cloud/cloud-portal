import { DashboardLayout } from '@/layouts/dashboard.layout';
import { useApp } from '@/providers/app.provider';
import { ControlPlaneStatus } from '@/resources/base';
import { createOrganizationService, type Organization } from '@/resources/organizations';
import {
  createProjectService,
  useHydrateProject,
  useProject,
  type Project,
} from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getOrgSession, redirectWithToast, setOrgSession } from '@/utils/cookies';
import { ValidationError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components/sidebar/nav-main';
import { AreaChartIcon, FolderDot, HomeIcon, NetworkIcon, SettingsIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router';

export interface ProjectLayoutLoaderData {
  project: Project;
  org: Organization;
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { projectId } = params;

  // Services now use global axios client with AsyncLocalStorage
  const projectService = createProjectService();
  const orgService = createOrganizationService();

  try {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    const project = await projectService.get(projectId);

    if (!project.name) {
      throw new ValidationError('Project not found');
    }

    const orgId = project.organizationId;
    if (!orgId) {
      throw new ValidationError('Organization ID not found for project');
    }
    const org = await orgService.get(orgId);

    const orgSession = await setOrgSession(request, org.name);

    return data({ project, org }, { headers: orgSession.headers });
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
  const { project: initialProject, org } = useLoaderData<ProjectLayoutLoaderData>();

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateProject(initialProject.name, initialProject);

  // Read from React Query cache
  const { data: queryData } = useProject(initialProject.name, {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const project = queryData ?? initialProject;

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
        href: getPathWithParams(paths.project.detail.proxy.root, {
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
            href: getPathWithParams(paths.project.detail.proxy.root, {
              projectId,
            }),
            type: 'link',
          },
        ],
      },
      {
        title: 'Metrics',
        href: getPathWithParams(paths.project.detail.metrics.root, { projectId }),
        type: 'link',
        icon: AreaChartIcon,
        disabled: !isReady,
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
      currentOrg={org}
      expandBehavior="push"
      showBackdrop={false}>
      <Outlet />
    </DashboardLayout>
  );
}
