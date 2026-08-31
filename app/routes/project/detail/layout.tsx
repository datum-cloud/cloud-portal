import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { ProjectBottomBar } from '@/features/project-bottom-bar';
import { SuspensionBar } from '@/features/project/suspension';
import { SearchEntry } from '@/features/search/SearchEntry';
import { ProjectSearchBar } from '@/features/search/surfaces/ProjectSearchBar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { DashboardLayout } from '@/layouts/dashboard.layout';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { useActiveServiceEntitlements } from '@/modules/plugins/client/use-active-service-entitlements';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import { buildProjectNavTree, mergePluginNavIntoTree } from '@/modules/project-nav';
import { QuotaWatchBridge } from '@/modules/quota';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import type { DslLoaderData } from '@/modules/rbac/types';
import { setSentryOrgContext, setSentryProjectContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import { ProjectProvider } from '@/providers/project.provider';
import { ControlPlaneStatus } from '@/resources/base';
import { useOrganization } from '@/resources/organizations';
import { createProjectService, useProject, type Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { setOrgSession, setProjectSession } from '@/utils/cookies';
import { env } from '@/utils/env';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { projectLegacySetupMiddleware, withMiddleware } from '@/utils/middlewares';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Outlet,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';

/**
 * Live project name for breadcrumbs. Loader data stays frozen under
 * skipRevalidateWithinSameProject, so prefer the app project (kept in sync
 * with React Query). Falls back to loader snapshot when unset.
 */
function ProjectBreadcrumbLabel({
  fallbackDisplayName,
  fallbackName,
}: {
  fallbackDisplayName?: string;
  fallbackName?: string;
}) {
  const { project } = useApp();
  return (
    <span>
      {project?.displayName ?? project?.name ?? fallbackDisplayName ?? fallbackName ?? 'Project'}
    </span>
  );
}

/**
 * Companion data attached to the project-detail loader envelope. Both companions
 * are tolerant of permission/fetch failures — denial leaves the flags at safe
 * defaults so the rest of the layout can still render.
 */
type ProjectLayoutCompanions = {
  billingEnabled: boolean | null;
  organizationId: string | null | undefined;
};

const RESTRICTED_TITLE = 'Access restricted';
const RESTRICTED_MESSAGE = "You don't have permission to view this project.";

const route = defineResourceRoute<Project, ProjectLayoutCompanions>({
  type: 'detail',
  resource: 'projects',
  paramName: 'projectId',
  notFoundLabel: 'Project',
  restrictedTitle: RESTRICTED_TITLE,
  restrictedMessage: RESTRICTED_MESSAGE,
  breadcrumb: ({ data }) => (
    <ProjectBreadcrumbLabel fallbackDisplayName={data?.displayName} fallbackName={data?.name} />
  ),
  metaTitle: ({ data }) => data?.displayName ?? data?.name ?? 'Project',
});

export const loader = withMiddleware(
  (args: LoaderFunctionArgs) =>
    runDetailLoader<Project, ProjectLayoutCompanions>(args, {
      resource: 'projects',
      group: 'resourcemanager.miloapis.com',
      scope: 'user',
      paramName: 'projectId',
      notFoundLabel: 'Project',
      fetch: ({ id }) => createProjectService().get(id),
      companions: {
        billingEnabled: {
          resource: 'projects',
          group: 'resourcemanager.miloapis.com',
          verb: 'get',
          scope: 'user',
          onError: 'tolerate',
          fetch: ({ data: project }) =>
            project?.organizationId
              ? isFeatureEnabled(FeatureFlag.Billing, project.organizationId)
              : Promise.resolve(false),
        },
        organizationId: {
          resource: 'projects',
          group: 'resourcemanager.miloapis.com',
          verb: 'get',
          scope: 'user',
          onError: 'tolerate',
          fetch: ({ data: project }) => Promise.resolve(project?.organizationId),
        },
      },
    }),
  projectLegacySetupMiddleware
);

export const handle = route.handle;
export const meta = route.meta;

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

/** Skip re-running the loader when navigating within the same project. */
export const shouldRevalidate = skipRevalidateWithinSameProject;

/**
 * Keep the dashboard chrome (header + org/project switcher) when the loader
 * returns restricted, so the user can navigate away instead of seeing a
 * full-page lock with no escape hatch. Child routes still use `route.Page`.
 */
export default function ProjectDetailLayout() {
  const loaderData = useLoaderData<DslLoaderData<Project, ProjectLayoutCompanions>>();
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { organization: appOrg } = useApp();

  const restrictedNavItems = useMemo(
    () => (projectId ? buildProjectNavTree(projectId) : []),
    [projectId]
  );

  if (loaderData.restricted) {
    return (
      <DashboardLayout
        navItems={restrictedNavItems}
        sidebarCollapsible="icon"
        defaultSidebarOpen={false}
        currentOrg={appOrg}
        expandBehavior="push"
        showBackdrop={false}>
        <RestrictedState title={RESTRICTED_TITLE} message={RESTRICTED_MESSAGE} />
      </DashboardLayout>
    );
  }

  return <ProjectDetailLayoutContent data={loaderData.data} companions={loaderData.companions} />;
}

function ProjectDetailLayoutContent({
  data: initialProject,
  companions,
}: {
  data: Project;
  companions: ProjectLayoutCompanions;
}) {
  const { projectId } = useParams();
  const location = useLocation();
  const fromOnboarding =
    (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding === true;
  const breakpoint = useBreakpoint();
  const seededOrgId = companions.organizationId;
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
    staleTime: fromOnboarding ? 0 : QUERY_STALE_TIME,
    refetchOnMount: fromOnboarding ? 'always' : false,
    initialData: fromOnboarding ? undefined : initialProject,
  });

  const orgId = project?.organizationId ?? seededOrgId ?? appOrg?.name ?? '';
  const { data: org, isLoading: orgLoading } = useOrganization(orgId, {
    enabled: !!orgId,
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });

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

  const { data: plugins } = useProjectPlugins(project?.name, { enabled: !!project?.name });
  const { data: activeServiceEntitlements } = useActiveServiceEntitlements(project?.name, {
    enabled: !!project?.name,
  });

  const navItems: NavItem[] = useMemo(() => {
    if (!project?.name) return [];

    const currentStatus = transformControlPlaneStatus(project.status);
    const isReady = currentStatus.status === ControlPlaneStatus.Success;
    const builtInTree = buildProjectNavTree(project.name, {
      isReady,
      queryClient,
      orgId,
    });
    return mergePluginNavIntoTree(builtInTree, plugins ?? [], project.name, {
      activeServiceEntitlements,
    });
  }, [project, queryClient, plugins, activeServiceEntitlements, orgId]);

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

  useEffect(() => {
    const oid = org?.name ?? appOrg?.name;
    if (project?.name && oid && lastSessionProjectRef.current !== project.name) {
      lastSessionProjectRef.current = project.name;
      sessionFetcher.submit({ projectId: project.name, orgId: oid }, { method: 'POST' });
    }
  }, [project?.name, org?.name, appOrg?.name, sessionFetcher]);

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
        defaultSidebarOpen={false}
        currentProject={currentProject}
        currentOrg={currentOrg}
        expandBehavior="push"
        showBackdrop={false}
        sidebarLoading={projectLoading}
        switcherLoading={projectLoading || orgLoading}
        bottomBar={env.public.chatbotEnabled ? <ProjectBottomBar /> : undefined}
        banner={<SuspensionBar />}
        headerContent={
          <div
            className={cn('flex h-full items-center justify-end border-l px-4', {
              'px-0': breakpoint === 'desktop',
            })}>
            {breakpoint === 'desktop' ? <ProjectSearchBar /> : <SearchEntry />}
          </div>
        }>
        <QuotaWatchBridge scope="project" />
        <Outlet />
      </DashboardLayout>
    </ProjectProvider>
  );
}
