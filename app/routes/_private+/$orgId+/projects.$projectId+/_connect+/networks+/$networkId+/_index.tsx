import { routes } from '@/constants/routes';
import { getPathWithParams } from '@/utils/helpers';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId, networkId } = params;

  return redirect(
    getPathWithParams(routes.projects.connect.networks.detail.overview, {
      orgId,
      projectId,
      networkId,
    })
  );
}, authMiddleware);
