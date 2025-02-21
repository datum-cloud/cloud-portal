import { redirect } from 'react-router'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { routes } from '@/constants/routes'

export const loader = withMiddleware(async () => {
  return redirect(routes.account.organizations.root)
}, authMiddleware)
