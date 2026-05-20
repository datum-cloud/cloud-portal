import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { useProjectContext } from '@/providers/project.provider';
import { ProjectLayoutLoaderData } from '@/routes/project/detail/layout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Project Settings</span>,
  path: (data: ProjectLayoutLoaderData) =>
    getPathWithParams(paths.project.detail.settings.general, {
      projectId: data?.project?.name ?? data?.projectId,
    }),
};

export default function ProjectSettingsLayout() {
  const { project } = useProjectContext();

  const navItems: SubNavigationTab[] = useMemo(() => {
    const projectId = project?.name;
    return [
      {
        label: 'General',
        href: getPathWithParams(paths.project.detail.settings.general, { projectId }),
      },
      /* {
        label: 'Notifications',
        href: getPathWithParams(paths.project.detail.settings.notifications, { projectId }),
      }, */
      {
        label: 'Quotas',
        href: getPathWithParams(paths.project.detail.settings.quotas, { projectId }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.settings.activity, { projectId }),
      },
    ];
  }, [project]);

  return (
    <SubLayout title="Project Settings" navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
