import { redirect } from 'react-router'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { routes } from '@/constants/routes'

export const loader = withMiddleware(async ({ params }) => {
  const { projectId } = params
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  return redirect(routes.projects.dashboard(projectId))
}, authMiddleware)
