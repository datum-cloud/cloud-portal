import { ProjectLayoutLoaderData } from '@/routes/project/detail/layout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Outlet } from 'react-router';

export const handle = {
  path: (data: ProjectLayoutLoaderData) => {
    return getPathWithParams(paths.project.detail.dnsZones.root, {
      projectId: data?.project?.name,
    });
  },
};

export default function Layout() {
  return <Outlet />;
}
