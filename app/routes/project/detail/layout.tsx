import { DashboardLayout } from '@/layouts/dashboard.layout';
import { setSentryOrgContext, setSentryProjectContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import { ControlPlaneStatus } from '@/resources/base';
import { connectorKeys, createConnectorService } from '@/resources/connectors';
import { createDnsZoneService, dnsZoneKeys } from '@/resources/dns-zones';
import { createDomainService, domainKeys } from '@/resources/domains';
import { createExportPolicyService, exportPolicyKeys } from '@/resources/export-policies';
import { createHttpProxyService, httpProxyKeys } from '@/resources/http-proxies';
import { createOrganizationService, type Organization } from '@/resources/organizations';
import {
  createProjectService,
  useHydrateProject,
  useProject,
  type Project,
} from '@/resources/projects';
import { createSecretService, secretKeys } from '@/resources/secrets';
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
import { useQueryClient } from '@tanstack/react-query';
import {
  CableIcon,
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

/** Skip re-running the loader when navigating within the same project (e.g. Home → AI Edge → Connectors). */
export function shouldRevalidate({
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}: {
  currentParams: Record<string, string | undefined>;
  nextParams: Record<string, string | undefined>;
  defaultShouldRevalidate: boolean;
}) {
  if (currentParams.projectId === nextParams.projectId) return false;
  return defaultShouldRevalidate;
}

export default function ProjectLayout() {
  const { project: initialProject, org } = useLoaderData<ProjectLayoutLoaderData>();
  const queryClient = useQueryClient();

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
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: domainKeys.list(projectId),
            queryFn: () => createDomainService().list(projectId),
          });
          void queryClient.prefetchQuery({
            queryKey: exportPolicyKeys.list(projectId),
            queryFn: () => createExportPolicyService().list(projectId),
          });
        },
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
        onPrefetch: () => {
          queryClient.prefetchQuery({
            queryKey: httpProxyKeys.list(projectId),
            queryFn: () => createHttpProxyService().list(projectId),
          });
        },
      },
      {
        title: 'Connectors',
        href: getPathWithParams(paths.project.detail.connectors.root, {
          projectId,
        }),
        type: 'link',
        icon: CableIcon,
        disabled: !isReady,
        onPrefetch: () => {
          queryClient.prefetchQuery({
            queryKey: connectorKeys.list(projectId),
            queryFn: () => createConnectorService().list(projectId),
          });
        },
      },
      {
        title: 'DNS',
        href: getPathWithParams(paths.project.detail.dnsZones.root, {
          projectId,
        }),
        icon: SignpostIcon,
        disabled: !isReady,
        type: 'link',
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: dnsZoneKeys.list(projectId),
            queryFn: () => createDnsZoneService().list(projectId),
          });
        },
      },
      {
        title: 'Domains',
        href: getPathWithParams(paths.project.detail.domains.root, {
          projectId,
        }),
        type: 'link',
        icon: LayersIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: domainKeys.list(projectId),
            queryFn: () => createDomainService().list(projectId),
          });
        },
      },
      {
        title: 'Metrics',
        href: getPathWithParams(paths.project.detail.metrics.root, { projectId }),
        type: 'link',
        icon: ChartSplineIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: exportPolicyKeys.list(projectId),
            queryFn: () => createExportPolicyService().list(projectId),
          });
        },
      },

      {
        title: 'Secrets',
        href: getPathWithParams(paths.project.detail.config.secrets.root, {
          projectId,
        }),
        type: 'link',
        icon: FileLockIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: secretKeys.list(projectId),
            queryFn: () => createSecretService().list(projectId),
          });
        },
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
  }, [project, queryClient]);

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
