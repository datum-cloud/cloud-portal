import { BackButton } from '@/components/back-button';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { DashboardLayout, SubLayout } from '@/layouts';
import { hasOrganizationsForRequest } from '@/resources/organizations/organization-request-cache.server';
import { paths } from '@/utils/config/paths.config';
import { Outlet, useLoaderData } from 'react-router';

export const loader = async () => {
  try {
    return { hasOrgs: await hasOrganizationsForRequest() };
  } catch {
    return { hasOrgs: false };
  }
};

export default function AccountSettingsLayout() {
  const { hasOrgs } = useLoaderData<typeof loader>();

  const navItems: SubNavigationTab[] = [
    {
      label: 'General',
      href: paths.account.settings.general,
    },
    {
      label: 'Security',
      href: paths.account.settings.security,
    },
    {
      label: 'Active Sessions',
      href: paths.account.settings.activeSessions,
    },
    {
      label: 'Activity',
      href: paths.account.settings.activity,
    },
  ];
  return (
    <DashboardLayout navItems={[]} sidebarCollapsible="none" contentClassName="w-full">
      <div className="mx-auto flex w-full flex-col gap-4 md:max-w-[1200px]">
        {hasOrgs && <BackButton to={paths.home}>Back to Dashboard</BackButton>}
        <SubLayout title="Account Settings" navItems={navItems}>
          <Outlet />
        </SubLayout>
      </div>
    </DashboardLayout>
  );
}
