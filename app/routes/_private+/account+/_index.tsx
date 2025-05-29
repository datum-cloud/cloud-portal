import { routes } from '@/constants/routes';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { redirect } from 'react-router';

export const loader = withMiddleware(async () => {
  return redirect(routes.account.organizations.root);
}, authMiddleware);
