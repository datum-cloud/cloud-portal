import { routes } from '@/constants/routes';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { getPathWithParams } from '@/utils/path';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId } = params;

  return redirect(
    getPathWithParams(routes.projects.dashboard, {
      orgId,
      projectId,
    })
  );
}, authMiddleware);
