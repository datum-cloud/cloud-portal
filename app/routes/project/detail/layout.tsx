import { ProjectBottomBar } from '@/features/project-bottom-bar';
import { DashboardLayout } from '@/layouts/dashboard.layout';
import { setSentryOrgContext, setSentryProjectContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import { ProjectProvider } from '@/providers/project.provider';
import { ControlPlaneStatus } from '@/resources/base';
import { connectorKeys, createConnectorService } from '@/resources/connectors';
import { createDnsZoneService, dnsZoneKeys } from '@/resources/dns-zones';
import { createDomainService, domainKeys } from '@/resources/domains';
import { createExportPolicyService, exportPolicyKeys } from '@/resources/export-policies';
import { createHttpProxyService, httpProxyKeys } from '@/resources/http-proxies';
import { createMachineAccountService, machineAccountKeys } from '@/resources/machine-accounts';
import { useOrganization, type Organization } from '@/resources/organizations';
import { useProject, type Project } from '@/resources/projects';
import { createSecretService, secretKeys } from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { setOrgSession, setProjectSession } from '@/utils/cookies';
import { env } from '@/utils/env';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  BotIcon,
  CableIcon,
  ChartSplineIcon,
  FileLockIcon,
  GaugeIcon,
  HomeIcon,
  LayersIcon,
  SettingsIcon,
  SignpostIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  Outlet,
  data,
  useFetcher,
  useNavigate,
  useParams,
} from 'react-router';

/** Minimal loader - returns projectId for breadcrumbs only. No blocking fetch. */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  return data({ projectId: params.projectId });
};

/** Sets org and project session cookies when user enters a project. Used for "return to last project" on next visit. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  const formData = await request.formData();
  const projectId = formData.get('projectId') as string | null;
  const orgId = formData.get('orgId') as string | null;

  if (!projectId || !orgId) {
    return new Response(null, { status: 400 });
  }

  const orgSession = await setOrgSession(request, orgId);
  const projectSession = await setProjectSession(request, projectId);
  const headers = combineHeaders(orgSession.headers, projectSession.headers);

  return new Response(null, { status: 204, headers });
};

/** @deprecated Use useProjectContext for project/org. Kept for breadcrumb handle.path compatibility. */
export interface ProjectLayoutLoaderData {
  project?: Project;
  org?: Organization;
  projectId?: string;
}

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
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionFetcher = useFetcher({ key: 'session-cookies' });
  const lastSessionProjectRef = useRef<string | null>(null);
  const { organization: appOrg, setOrganization, setProject } = useApp();

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorDetail,
  } = useProject(projectId ?? '', {
    enabled: !!projectId,
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });

  // Fire in parallel with the project query: seed orgId from AppProvider (set
  // when the user was on an org route) so useOrganization doesn't have to wait
  // for useProject to resolve before it can start. Once the project resolves its
  // organizationId, the query key refines; TanStack Query deduplicates the
  // request if the id matches the appOrg already in cache.
  const orgId = project?.organizationId ?? appOrg?.name ?? '';
  const { data: org, isLoading: orgLoading } = useOrganization(orgId, {
    enabled: !!orgId,
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });

  // Redirect on error (invalid project, not found, etc.)
  useEffect(() => {
    if (projectError && projectId) {
      toast.error('Project unavailable', {
        description: projectErrorDetail?.message ?? 'Project not found',
      });
      const redirectPath = appOrg?.name
        ? getPathWithParams(paths.org.detail.projects.root, { orgId: appOrg.name })
        : paths.account.organizations.root;
      navigate(redirectPath);
    }
  }, [projectError, projectErrorDetail, projectId, appOrg?.name, navigate]);

  const projectContextValue = useMemo(
    () => ({
      project,
      org: org ?? undefined,
      isLoading: projectLoading,
      error: projectError ? (projectErrorDetail ?? new Error('Project unavailable')) : null,
    }),
    [project, org, projectLoading, projectError, projectErrorDetail]
  );

  const navItems: NavItem[] = useMemo(() => {
    if (!project?.name) return [];

    const currentStatus = transformControlPlaneStatus(project.status);
    const isReady = currentStatus.status === ControlPlaneStatus.Success;
    const pid = project.name;

    const settingsGeneral = getPathWithParams(paths.project.detail.settings.general, {
      projectId: pid,
    });
    const settingsActivity = getPathWithParams(paths.project.detail.settings.activity, {
      projectId: pid,
    });
    const settingsNotifications = getPathWithParams(paths.project.detail.settings.notifications, {
      projectId: pid,
    });
    const settingsQuotas = getPathWithParams(paths.project.detail.settings.quotas, {
      projectId: pid,
    });

    return [
      {
        title: 'Home',
        href: getPathWithParams(paths.project.detail.home, { projectId: pid }),
        type: 'link',
        icon: HomeIcon,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: domainKeys.list(pid),
            queryFn: () => createDomainService().list(pid),
          });
          void queryClient.prefetchQuery({
            queryKey: exportPolicyKeys.list(pid),
            queryFn: () => createExportPolicyService().list(pid),
          });
        },
      },
      {
        title: 'AI Edge',
        href: getPathWithParams(paths.project.detail.proxy.root, { projectId: pid }),
        icon: GaugeIcon,
        disabled: !isReady,
        type: 'link',
        showSeparatorAbove: true,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: httpProxyKeys.list(pid),
            queryFn: () => createHttpProxyService().list(pid),
          });
        },
      },
      {
        title: 'Connectors',
        href: getPathWithParams(paths.project.detail.connectors.root, { projectId: pid }),
        type: 'link',
        icon: CableIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: connectorKeys.list(pid),
            queryFn: () => createConnectorService().list(pid),
          });
        },
      },
      {
        title: 'DNS',
        href: getPathWithParams(paths.project.detail.dnsZones.root, { projectId: pid }),
        icon: SignpostIcon,
        disabled: !isReady,
        type: 'link',
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: dnsZoneKeys.list(pid),
            queryFn: () => createDnsZoneService().list(pid),
          });
        },
      },
      {
        title: 'Domains',
        href: getPathWithParams(paths.project.detail.domains.root, { projectId: pid }),
        type: 'link',
        icon: LayersIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: domainKeys.list(pid),
            queryFn: () => createDomainService().list(pid),
          });
        },
      },
      {
        title: 'Metrics',
        href: getPathWithParams(paths.project.detail.metrics.root, { projectId: pid }),
        type: 'link',
        icon: ChartSplineIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: exportPolicyKeys.list(pid),
            queryFn: () => createExportPolicyService().list(pid),
          });
        },
      },
      {
        title: 'Secrets',
        href: getPathWithParams(paths.project.detail.secrets.root, { projectId: pid }),
        type: 'link',
        icon: FileLockIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: secretKeys.list(pid),
            queryFn: () => createSecretService().list(pid),
          });
        },
      },
      {
        title: 'Machine Accounts',
        href: getPathWithParams(paths.project.detail.machineAccounts.root, { projectId: pid }),
        type: 'link',
        icon: BotIcon,
        disabled: !isReady,
        onPrefetch: () => {
          void queryClient.prefetchQuery({
            queryKey: machineAccountKeys.list(pid),
            queryFn: () => createMachineAccountService().list(pid),
          });
        },
      },
      {
        title: 'Project Settings',
        href: getPathWithParams(paths.project.detail.settings.general, { projectId: pid }),
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
    const currentOrg = org ?? appOrg;
    if (currentOrg) {
      setOrganization(currentOrg);
      setSentryOrgContext(currentOrg);
    }
  }, [org, appOrg, setOrganization]);

  useEffect(() => {
    if (project) {
      setProject(project);
      setSentryProjectContext(project);
    }
  }, [project, setProject]);

  // Set org/project session cookies when project loads - enables "return to last project" on next visit
  useEffect(() => {
    const orgId = org?.name ?? appOrg?.name;
    if (project?.name && orgId && lastSessionProjectRef.current !== project.name) {
      lastSessionProjectRef.current = project.name;
      sessionFetcher.submit({ projectId: project.name, orgId }, { method: 'POST' });
    }
  }, [project?.name, org?.name, appOrg?.name, sessionFetcher]);

  // Don't render content while redirecting on error
  if (projectError && projectId) {
    return null;
  }

  const currentOrg = org ?? appOrg;
  const currentProject = project ?? undefined;

  return (
    <ProjectProvider value={projectContextValue}>
      <DashboardLayout
        navItems={navItems}
        sidebarCollapsible="icon"
        currentProject={currentProject}
        currentOrg={currentOrg}
        expandBehavior="push"
        showBackdrop={false}
        sidebarLoading={projectLoading}
        switcherLoading={projectLoading || orgLoading}
        bottomBar={env.public.chatbotEnabled ? <ProjectBottomBar /> : undefined}>
        <Outlet />
      </DashboardLayout>
    </ProjectProvider>
  );
}
