import { routes } from '@/constants/routes';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

export const loader = withMiddleware(async ({ params }) => {
  const { orgId } = params;

  return redirect(getPathWithParams(routes.org.projects.root, { orgId }));
}, authMiddleware);
