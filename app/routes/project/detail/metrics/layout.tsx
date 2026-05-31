import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import type { DslLoaderData } from '@/modules/rbac';
import { type Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useParams } from 'react-router';

type ProjectDetailEnvelope = DslLoaderData<Project, Record<string, unknown>>;

export const handle = {
  breadcrumb: () => <span>Metrics</span>,
  path: (data?: ProjectDetailEnvelope) => {
    const projectName = data && !data.restricted ? data.data?.name : undefined;
    return getPathWithParams(paths.project.detail.metrics.root, {
      projectId: projectName,
    });
  },
};

export default function Layout() {
  const { projectId } = useParams();

  const navItems: SubNavigationTab[] = useMemo(() => {
    return [
      {
        label: 'Create an Export Policy',
        href: getPathWithParams(paths.project.detail.metrics.new, {
          projectId,
        }),
      },
      {
        label: 'Your Export Policies',
        href: getPathWithParams(paths.project.detail.metrics.root, {
          projectId,
        }),
      },
    ];
  }, [projectId]);

  return (
    <SubLayout title="Export Policies" navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
