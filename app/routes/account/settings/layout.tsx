import { BackButton } from '@/components/back-button';
import { DashboardLayout, TabsLayout, TabsNavProps } from '@/layouts';
import { paths } from '@/utils/config/paths.config';
import { Outlet } from 'react-router';

export default function AccountSettingsLayout() {
  const navItems: TabsNavProps[] = [
    {
      value: 'general',
      label: 'General',
      to: paths.account.settings.general,
    },
    // {
    //   value: 'security',
    //   label: 'Security',
    //   to: paths.account.settings.security,
    // },
    {
      value: 'active-sessions',
      label: 'Active Sessions',
      to: paths.account.settings.activeSessions,
    },
    // {
    //   value: 'access-tokens',
    //   label: 'Access Tokens',
    //   to: paths.account.settings.accessTokens,
    // },
    {
      value: 'activity',
      label: 'Activity',
      to: paths.account.settings.activity,
    },
  ];
  return (
    <DashboardLayout navItems={[]} sidebarCollapsible="none" contentClassName="w-full">
      <div className="mx-auto flex w-full flex-col gap-4 md:max-w-[1200px]">
        <BackButton to={paths.home}>Back to Dashboard</BackButton>
        <TabsLayout tabsTitle={{ title: 'Account Settings' }} navItems={navItems}>
          <Outlet />
        </TabsLayout>
      </div>
    </DashboardLayout>
  );
}
