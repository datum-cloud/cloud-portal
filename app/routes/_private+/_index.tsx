import { redirect } from 'react-router'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { routes } from '@/constants/routes'

export const loader = withMiddleware(() => {
  return redirect(routes.onboarding.root)
}, authMiddleware)
