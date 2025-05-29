import { routes } from '@/constants/routes';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { getPathWithParams } from '@/utils/path';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId, exportPolicyId } = params;

  return redirect(
    getPathWithParams(routes.projects.observe.exportPolicies.detail.overview, {
      orgId,
      projectId,
      exportPolicyId,
    })
  );
}, authMiddleware);
