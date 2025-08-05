import { paths } from '@/config/paths';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { getPathWithParams } from '@/utils/path';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId, networkId } = params;

  return redirect(
    getPathWithParams(paths.projects.connect.networks.detail.overview, {
      orgId,
      projectId,
      networkId,
    })
  );
}, authMiddleware);
