import { DashboardLayout } from '@/layouts/dashboard.layout';
import { setSentryOrgContext, setSentryProjectContext } from '@/modules/sentry';
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
import {
  getOrgSession,
  redirectWithToast,
  setOrgSession,
  setProjectSession,
} from '@/utils/cookies';
import { ValidationError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components/sidebar/nav-main';
import {
  ChartSplineIcon,
  FileLockIcon,
  GaugeIcon,
  HomeIcon,
  LayersIcon,
  SettingsIcon,
  SignpostIcon,
} from 'lucide-react';
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

    // Set both org and project cookies
    const orgSession = await setOrgSession(request, org.name);
    const projectSession = await setProjectSession(request, project.name);

    // Combine headers from both cookie operations
    const headers = combineHeaders(orgSession.headers, projectSession.headers);

    return data({ project, org }, { headers });
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

    const settingsGeneral = getPathWithParams(paths.project.detail.settings.general, {
      projectId,
    });
    const settingsActivity = getPathWithParams(paths.project.detail.settings.activity, {
      projectId,
    });
    const settingsNotifications = getPathWithParams(paths.project.detail.settings.notifications, {
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
        title: 'AI Edge',
        href: getPathWithParams(paths.project.detail.proxy.root, {
          projectId,
        }),
        icon: GaugeIcon,
        disabled: !isReady,
        type: 'link',
        showSeparatorAbove: true,
      },
      // {
      //   title: 'Tunnels',
      //   href: '/',
      //   icon: NetworkIcon,
      //   disabled: true,
      //   type: 'link',
      // },
      {
        title: 'DNS',
        href: getPathWithParams(paths.project.detail.dnsZones.root, {
          projectId,
        }),
        icon: SignpostIcon,
        disabled: !isReady,
        type: 'link',
      },
      {
        title: 'Domains',
        href: getPathWithParams(paths.project.detail.domains.root, {
          projectId,
        }),
        type: 'link',
        icon: LayersIcon,
        disabled: !isReady,
      },
      {
        title: 'Metrics',
        href: getPathWithParams(paths.project.detail.metrics.root, { projectId }),
        type: 'link',
        icon: ChartSplineIcon,
        disabled: !isReady,
      },
      {
        title: 'Secrets',
        href: getPathWithParams(paths.project.detail.config.secrets.root, {
          projectId,
        }),
        type: 'link',
        icon: FileLockIcon,
        disabled: !isReady,
      },
      {
        title: 'Project Settings',
        href: getPathWithParams(paths.project.detail.settings.general, { projectId }),
        type: 'link',
        disabled: !isReady,
        icon: SettingsIcon,
        showSeparatorAbove: true,
        showSeparatorBelow: true,
        tabChildLinks: [settingsGeneral, settingsActivity, settingsQuotas, settingsNotifications],
      },
    ];
  }, [project]);

  useEffect(() => {
    if (org) {
      setOrganization(org);
      setSentryOrgContext(org);
    }
  }, [org]);

  useEffect(() => {
    if (project) {
      setProject(project);
      setSentryProjectContext(project);
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
