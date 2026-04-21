import { BackButton } from '@/components/back-button';
import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import { DashboardLayout } from '@/layouts';
import { paths } from '@/utils/config/paths.config';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { Outlet } from 'react-router';

export default function AccountSettingsLayout() {
  const navItems: SubNavigationTab[] = [
    {
      label: 'General',
      href: paths.account.settings.general,
    },
    // {
    //   label: 'Security',
    //   href: paths.account.settings.security,
    // },
    {
      label: 'Active Sessions',
      href: paths.account.settings.activeSessions,
    },
    // {
    //   label: 'Access Tokens',
    //   href: paths.account.settings.accessTokens,
    // },
    {
      label: 'Activity',
      href: paths.account.settings.activity,
    },
  ];
  return (
    <DashboardLayout navItems={[]} sidebarCollapsible="none" contentClassName="w-full">
      <div className="mx-auto flex w-full flex-col gap-4 md:max-w-[1200px]">
        <BackButton to={paths.home}>Back to Dashboard</BackButton>
        <div className="flex h-full flex-1 flex-col gap-8">
          <PageTitle title="Account Settings" />
          <SubNavigationTabs tabs={navItems} />
          <div className="h-full w-full pt-2">
            <div className="flex h-full flex-1 flex-col">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
