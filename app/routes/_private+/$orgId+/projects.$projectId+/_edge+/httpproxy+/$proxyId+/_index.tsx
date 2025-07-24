import { routes } from '@/constants/routes';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, orgId, proxyId } = params;

  return redirect(
    getPathWithParams(routes.projects.internetEdge.httpProxy.detail.overview, {
      orgId,
      projectId,
      proxyId,
    })
  );
};
