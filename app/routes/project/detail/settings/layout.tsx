import TabsLayout from '@/layouts/tabs/tabs.layout';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { ProjectLayoutLoaderData } from '@/routes/project/detail/layout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Project Settings</span>,
  path: (data: ProjectLayoutLoaderData) => {
    return getPathWithParams(paths.project.detail.settings.preferences, {
      projectId: data?.project?.name,
    });
  },
};

export default function OrgSettingsLayout() {
  const { project } = useRouteLoaderData('project-detail');

  const navItems: TabsNavProps[] = useMemo(() => {
    const projectId = project?.name;
    return [
      {
        value: 'preferences',
        label: 'Preferences',
        to: getPathWithParams(paths.project.detail.settings.preferences, { projectId }),
      },
      // {
      //   value: 'quotas',
      //   label: 'Quotas',
      //   to: getPathWithParams(paths.project.detail.settings.quotas, { projectId }),
      // },
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
