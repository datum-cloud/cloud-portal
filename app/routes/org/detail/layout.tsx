import { DashboardLayout } from '@/layouts/dashboard.layout';
import { RbacProvider } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api/organizations/$id';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { HttpError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components/sidebar/nav-main';
import { FolderRoot, SettingsIcon, UsersIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: IOrganization) => <span>{data?.displayName}</span>,
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  try {
    const { orgId } = params;

    const res = await fetch(
      `${process.env.APP_URL}${getPathWithParams(ORG_DETAIL_PATH, { id: orgId })}`,
      {
        method: 'GET',
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      }
    );

    const org = await res.json();

    if (!org.success) {
      throw new HttpError(org.error, org.status);
    }

    return data(org.data);
  } catch {
    return redirectWithToast(paths.account.organizations.root, {
      title: 'Error',
      description: 'Organization not found',
      type: 'error',
    });
  }
};

export default function OrgLayout() {
  const org = useLoaderData<typeof loader>();

  const { setOrganization } = useApp();

  const navItems: NavItem[] = useMemo(() => {
    const orgId = org?.name;
    const settingsPreferences = getPathWithParams(paths.org.detail.settings.general, { orgId });
    const settingsActivity = getPathWithParams(paths.org.detail.settings.activity, { orgId });
    const settingsQuotas = getPathWithParams(paths.org.detail.settings.quotas, { orgId });
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
        hidden: org?.type === OrganizationType.Personal,
        icon: UsersIcon,
      },
      {
        title: 'Organization Settings',
        href: settingsPreferences,
        type: 'link',
        icon: SettingsIcon,
        tabChildLinks: [
          settingsPreferences,
          settingsActivity,
          settingsQuotas,
          // settingsPolicyBindings,
        ],
      },
    ];
  }, [org]);

  useEffect(() => {
    if (org) {
      setOrganization(org);
    }
  }, [org]);

  return (
    <DashboardLayout navItems={navItems} sidebarCollapsible="offcanvas" currentOrg={org}>
      <RbacProvider organizationId={org?.name}>
        <Outlet />
      </RbacProvider>
    </DashboardLayout>
  );
}
