import { paths } from '@/config/paths';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { getPathWithParams } from '@/utils/path';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId, workloadId } = params;

  return redirect(
    getPathWithParams(paths.projects.deploy.workloads.detail.overview, {
      orgId,
      projectId,
      workloadId,
    })
  );
}, authMiddleware);
