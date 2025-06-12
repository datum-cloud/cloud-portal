import { routes } from '@/constants/routes';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { redirect } from 'react-router';

export const loader = withMiddleware(async () => {
  return redirect(routes.account.organizations.root);
}, authMiddleware);
