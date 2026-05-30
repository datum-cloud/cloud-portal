import { DashboardLayout } from '@/layouts/dashboard.layout';
import { RbacProvider } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { setSentryOrgContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import { type Organization, createOrganizationService } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { clearProjectSession, setOrgSession } from '@/utils/cookies';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { FolderRoot, SettingsIcon, UsersIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, type ShouldRevalidateFunction } from 'react-router';

const route = defineResourceRoute<Organization>({
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
  runDetailLoader<Organization, Record<string, never>>(args, {
    resource: 'organizations',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    paramName: 'orgId',
    notFoundLabel: 'Organization',
    fetch: ({ id }) => createOrganizationService().get(id),
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

export default route.Page(({ data: initialOrg }) => {
  const { organization, setOrganization, setProject } = useApp();

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
      },
      {
        title: 'Team',
        href: getPathWithParams(paths.org.detail.team.root, { orgId }),
        type: 'link',
        hidden: org?.type === 'Personal',
        icon: UsersIcon,
      },
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
  }, [org]);

  // Sync SSR org to app state on initial load or org change
  useEffect(() => {
    setOrganization(initialOrg);
    setProject(undefined);
    setSentryOrgContext(initialOrg);
  }, [initialOrg, setOrganization, setProject]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon" currentOrg={org}>
      <RbacProvider organizationId={org?.name}>
        <Outlet />
      </RbacProvider>
    </DashboardLayout>
  );
});
