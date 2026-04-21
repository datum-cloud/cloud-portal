import { SubLayout } from '@/layouts';
import { ProjectLayoutLoaderData } from '@/routes/project/detail/layout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { useMemo } from 'react';
import { Outlet, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Metrics</span>,
  path: (data: ProjectLayoutLoaderData) => {
    return getPathWithParams(paths.project.detail.metrics.root, {
      projectId: data?.project?.name ?? data?.projectId,
    });
  },
};

export default function Layout() {
  const { projectId } = useParams();

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Create an Export Policy',
        href: getPathWithParams(paths.project.detail.metrics.new, {
          projectId,
        }),
        type: 'link',
      },
      {
        title: 'Your Export Policies',
        href: getPathWithParams(paths.project.detail.metrics.root, {
          projectId,
        }),
        type: 'link',
        excludePaths: [
          getPathWithParams(paths.project.detail.metrics.new, {
            projectId,
          }),
        ],
      },
    ];
  }, [projectId]);

  return (
    <SubLayout
      sidebarHeader={<span className="text-primary text-sm font-semibold">Metrics</span>}
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
