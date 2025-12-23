import { ProjectLayoutLoaderData } from '@/routes/project/detail/layout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Metrics</span>,
  path: (data: ProjectLayoutLoaderData) => {
    return getPathWithParams(paths.project.detail.metrics.root, {
      projectId: data?.project?.name,
    });
  },
};

export default function Layout() {
  return <Outlet />;
}
