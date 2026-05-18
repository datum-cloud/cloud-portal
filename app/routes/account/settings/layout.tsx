import { BackButton } from '@/components/back-button';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { DashboardLayout, SubLayout } from '@/layouts';
import { paths } from '@/utils/config/paths.config';
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
        <SubLayout title="Account Settings" navItems={navItems}>
          <Outlet />
        </SubLayout>
      </div>
    </DashboardLayout>
  );
}
