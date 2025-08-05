import { paths } from '@/config/paths';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, orgId, proxyId } = params;

  return redirect(
    getPathWithParams(paths.projects.internetEdge.httpProxy.detail.overview, {
      orgId,
      projectId,
      proxyId,
    })
  );
};
