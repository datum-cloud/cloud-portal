import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import type { DslLoaderData } from '@/modules/rbac';
import { useProjectContext } from '@/providers/project.provider';
import { type Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router';

type ProjectDetailEnvelope = DslLoaderData<
  Project,
  {
    billingEnabled?: boolean | null;
  }
>;

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
  const parent = useRouteLoaderData('project-detail') as ProjectDetailEnvelope | undefined;
  const billingEnabled =
    parent && parent.restricted === false ? (parent.companions.billingEnabled ?? false) : false;

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
      ...(billingEnabled
        ? [
            {
              label: 'Billing',
              href: getPathWithParams(paths.project.detail.settings.billing, { projectId }),
            },
          ]
        : []),
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.settings.activity, { projectId }),
      },
    ];
  }, [project, billingEnabled]);

  return (
    <SubLayout title="Project Settings" navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
