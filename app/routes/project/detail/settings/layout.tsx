import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import type { DslLoaderData } from '@/modules/rbac';
import { useProjectContext } from '@/providers/project.provider';
import { type Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet } from 'react-router';

type ProjectDetailEnvelope = DslLoaderData<Project, Record<string, unknown>>;

export const handle = {
  breadcrumb: () => <span>Project Settings</span>,
  path: (data?: ProjectDetailEnvelope) => {
    const projectName = data && !data.restricted ? data.data?.name : undefined;
    return getPathWithParams(paths.project.detail.settings.general, {
      projectId: projectName,
    });
  },
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
