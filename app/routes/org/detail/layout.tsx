import { DashboardLayout } from '@/layouts/dashboard.layout';
import { RbacProvider } from '@/modules/rbac';
import { setSentryOrgContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import { createOrganizationService, type Organization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { clearProjectSession, redirectWithToast, setOrgSession } from '@/utils/cookies';
import { NotFoundError } from '@/utils/errors';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components/sidebar/nav-main';
import { FolderRoot, SettingsIcon, UsersIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: Organization) => <span>{data?.displayName}</span>,
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new NotFoundError('Organization');
  }

  try {
    // Services now use global axios client with AsyncLocalStorage
    const orgService = createOrganizationService();

    const org = await orgService.get(orgId);

    // Set org cookie and clear project cookie (projects belong to orgs)
    const orgSession = await setOrgSession(request, org.name);
    const projectSession = await clearProjectSession(request);

    // Combine headers from both cookie operations
    const headers = combineHeaders(orgSession.headers, projectSession.headers);

    return data(org, { headers });
  } catch {
    return redirectWithToast(paths.account.organizations.root, {
      title: 'Error',
      description: 'Organization not found',
      type: 'error',
    });
  }
};

export default function OrgLayout() {
  const initialOrg = useLoaderData<typeof loader>();

  const { organization, setOrganization, setProject } = useApp();

  // Use app state (updated by mutations), fallback to SSR data
  const org = organization?.name === initialOrg?.name ? organization : initialOrg;

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
    if (initialOrg) {
      setOrganization(initialOrg);
      setProject(undefined);
      setSentryOrgContext(initialOrg);
    }
  }, [initialOrg, setOrganization, setProject]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="icon" currentOrg={org}>
      <RbacProvider organizationId={org?.name}>
        <Outlet />
      </RbacProvider>
    </DashboardLayout>
  );
}
