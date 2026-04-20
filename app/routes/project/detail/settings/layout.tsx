import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import { useProjectContext } from '@/providers/project.provider';
import { ProjectLayoutLoaderData } from '@/routes/project/detail/layout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
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
    <div className="flex h-full flex-1 flex-col gap-8">
      <PageTitle title="Project Settings" />
      <SubNavigationTabs tabs={navItems} />
      <div className="h-full w-full pt-2">
        <div className="flex h-full flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
