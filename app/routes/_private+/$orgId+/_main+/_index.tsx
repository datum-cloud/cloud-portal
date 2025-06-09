import { routes } from '@/constants/routes';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { orgId } = params;

  return redirect(getPathWithParams(routes.org.projects.root, { orgId }));
}, authMiddleware);
