import TabsLayout from '@/layouts/tabs/tabs.layout';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router';

export default function OrgSettingsLayout() {
  const { project } = useRouteLoaderData('project-detail');

  const navItems: TabsNavProps[] = useMemo(() => {
    const projectId = project?.name;
    return [
      {
        value: 'general',
        label: 'General',
        to: getPathWithParams(paths.project.detail.settings.general, { projectId }),
      },
      /* {
        value: 'notifications',
        label: 'Notifications',
        to: getPathWithParams(paths.project.detail.settings.notifications, { projectId }),
      }, */
      {
        value: 'quotas',
        label: 'Quotas',
        to: getPathWithParams(paths.project.detail.settings.quotas, { projectId }),
      },
      {
        value: 'activity',
        label: 'Activity',
        to: getPathWithParams(paths.project.detail.settings.activity, { projectId }),
      },
    ];
  }, [project]);
  return (
    <TabsLayout tabsTitle={{ title: 'Project Settings' }} navItems={navItems}>
      <Outlet />
    </TabsLayout>
  );
}
