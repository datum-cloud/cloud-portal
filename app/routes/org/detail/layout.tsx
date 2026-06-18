import { DashboardLayout } from '@/layouts/dashboard.layout';
import { fetchOrgUsageDashboard, usageKeys } from '@/modules/billing/usage.queries';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { setSentryOrgContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import {
  billingAccountBindingKeys,
  createBillingAccountBindingService,
} from '@/resources/billing-account-bindings';
import { billingAccountKeys, createBillingAccountService } from '@/resources/billing-accounts';
import { createGroupService, groupKeys } from '@/resources/groups';
import { createInvitationService, invitationKeys } from '@/resources/invitations';
import { createMemberService, memberKeys } from '@/resources/members';
import { type Organization, createOrganizationService } from '@/resources/organizations';
import { createProjectService, projectKeys } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { clearProjectSession, setOrgSession } from '@/utils/cookies';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3Icon, FolderRoot, SettingsIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, type ShouldRevalidateFunction } from 'react-router';

type OrgLayoutCompanions = {
  billingEnabled: boolean | null;
  usageMeteringEnabled: boolean | null;
};

const route = defineResourceRoute<Organization, OrgLayoutCompanions>({
  type: 'detail',
  resource: 'organizations',
  paramName: 'orgId',
  notFoundLabel: 'Organization',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this organization.",
  breadcrumb: ({ data }) => <span>{data?.displayName ?? data?.name ?? 'Organization'}</span>,
  metaTitle: ({ data }) => data?.displayName ?? data?.name ?? 'Organization',
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<Organization, OrgLayoutCompanions>(args, {
    resource: 'organizations',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    paramName: 'orgId',
    notFoundLabel: 'Organization',
    fetch: ({ id }) => createOrganizationService().get(id),
    companions: {
      billingEnabled: {
        resource: 'organizations',
        group: 'resourcemanager.miloapis.com',
        verb: 'get',
        scope: 'user',
        onError: 'tolerate',
        fetch: ({ data: org }) =>
          org?.name ? isFeatureEnabled(FeatureFlag.Billing, org.name) : Promise.resolve(false),
      },
      usageMeteringEnabled: {
        resource: 'organizations',
        group: 'resourcemanager.miloapis.com',
        verb: 'get',
        scope: 'user',
        onError: 'tolerate',
        fetch: ({ data: org }) =>
          org?.name
            ? isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, org.name)
            : Promise.resolve(false),
      },
    },
    setHeaders: async ({ data: org, args: loaderArgs }) => {
      // Preserve the existing cookie side-effects: pin the current org and
      // clear any stale project pick. Only runs on the success path.
      const orgSession = await setOrgSession(loaderArgs.request, org.name);
      const projectSession = await clearProjectSession(loaderArgs.request);
      return combineHeaders(orgSession.headers, projectSession.headers);
    },
  });
export const handle = route.handle;
export const meta = route.meta;

// shouldRevalidate stays outside the DSL — it's a route-level optimization
// (skip re-fetching when navigating within the same org since URQL cache is warm).
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  // Navigating within the same org — URQL cache is warm, skip re-fetching
  // URL pattern: /org/{orgId}/... → split('/') gives ['', 'org', '{orgId}', ...]
  const currentOrgId = currentUrl.pathname.split('/')[2];
  const nextOrgId = nextUrl.pathname.split('/')[2];

  if (currentOrgId && nextOrgId && currentOrgId === nextOrgId) {
    return false;
  }

  return defaultShouldRevalidate;
};

export default route.Page(({ data: initialOrg, companions }) => {
  const billingEnabled = companions.billingEnabled ?? false;
  const usageMeteringEnabled = companions.usageMeteringEnabled ?? false;
  const { organization, setOrganization, setProject } = useApp();
  const queryClient = useQueryClient();

  // Use app state (updated by mutations), fallback to SSR data
  const org = organization?.name === initialOrg.name ? organization : initialOrg;

  const navItems: NavItem[] = useMemo(() => {
    const orgId = org?.name;
    const settingsPreferences = getPathWithParams(paths.org.detail.settings.general, { orgId });
    const settingsActivity = getPathWithParams(paths.org.detail.settings.activity, { orgId });
    const settingsQuotas = getPathWithParams(paths.org.detail.settings.quotas, { orgId });
    const settingsNotifications = getPathWithParams(paths.org.detail.settings.notifications, {
      orgId,
    });
    // const settingsPolicyBindings = getPathWithParams(paths.org.detail.policyBindings.root, {
    //   orgId,
    // });

    return [
      {
        title: 'Projects',
        href: getPathWithParams(paths.org.detail.projects.root, { orgId }),
        type: 'link',
        icon: FolderRoot,
        onPrefetch: () => {
          if (!orgId) return;
          void queryClient.prefetchQuery({
            queryKey: projectKeys.list(orgId),
            queryFn: () => createProjectService().list(orgId),
            staleTime: QUERY_STALE_TIME,
          });
        },
      },
      {
        title: 'Team',
        href: getPathWithParams(paths.org.detail.team.root, { orgId }),
        type: 'link',
        hidden: org?.type === 'Personal',
        icon: UsersIcon,
        onPrefetch: () => {
          if (!orgId) return;
          void queryClient.prefetchQuery({
            queryKey: memberKeys.list(orgId),
            queryFn: () => createMemberService().list(orgId),
            staleTime: QUERY_STALE_TIME,
          });
          void queryClient.prefetchQuery({
            queryKey: invitationKeys.list(orgId),
            queryFn: () => createInvitationService().list(orgId),
            staleTime: QUERY_STALE_TIME,
          });
          void queryClient.prefetchQuery({
            queryKey: groupKeys.list(orgId),
            queryFn: () => createGroupService().list(orgId),
            staleTime: QUERY_STALE_TIME,
          });
        },
      },
      ...(usageMeteringEnabled
        ? [
            {
              title: 'Usage',
              href: getPathWithParams(paths.org.detail.usage, { orgId }),
              type: 'link' as const,
              icon: BarChart3Icon,
              onPrefetch: () => {
                if (!orgId) return;
                void queryClient.prefetchQuery({
                  queryKey: projectKeys.list(orgId),
                  queryFn: () => createProjectService().list(orgId),
                  staleTime: QUERY_STALE_TIME,
                });
                void queryClient.prefetchQuery({
                  queryKey: usageKeys.dashboard(orgId, 'all', 'current'),
                  queryFn: () =>
                    fetchOrgUsageDashboard({ orgId, project: 'all', cycle: 'current' }),
                  staleTime: QUERY_STALE_TIME,
                });
              },
            },
          ]
        : []),
      ...(billingEnabled
        ? [
            {
              title: 'Billing',
              href: getPathWithParams(paths.org.detail.billing.root, { orgId }),
              type: 'link' as const,
              icon: WalletIcon,
              onPrefetch: () => {
                if (!orgId) return;
                void queryClient.prefetchQuery({
                  queryKey: billingAccountKeys.list(orgId),
                  queryFn: () => createBillingAccountService().list(orgId),
                  staleTime: QUERY_STALE_TIME,
                });
                void queryClient.prefetchQuery({
                  queryKey: billingAccountBindingKeys.list(orgId),
                  queryFn: () => createBillingAccountBindingService().list(orgId),
                  staleTime: QUERY_STALE_TIME,
                });
                void queryClient.prefetchQuery({
                  queryKey: projectKeys.list(orgId),
                  queryFn: () => createProjectService().list(orgId),
                  staleTime: QUERY_STALE_TIME,
                });
              },
            },
          ]
        : []),
      {
        title: 'Organization Settings',
        href: settingsPreferences,
        type: 'link',
        icon: SettingsIcon,
        showSeparatorAbove: true,
        tabChildLinks: [
          settingsPreferences,
          settingsNotifications,
          settingsActivity,
          settingsQuotas,
          // settingsPolicyBindings,
        ],
      },
    ];
  }, [org, queryClient, billingEnabled, usageMeteringEnabled]);

  // Sync SSR org to app state on initial load or org change
  useEffect(() => {
    setOrganization(initialOrg);
    setProject(undefined);
    setSentryOrgContext(initialOrg);
  }, [initialOrg, setOrganization, setProject]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon" currentOrg={org}>
      <Outlet />
    </DashboardLayout>
  );
});
