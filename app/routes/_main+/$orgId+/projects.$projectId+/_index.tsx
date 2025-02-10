import { redirect } from 'react-router'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { routes } from '@/constants/routes'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId } = params
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  return redirect(
    getPathWithParams(routes.projects.dashboard, {
      orgId,
      projectId,
    }),
  )
}, authMiddleware)
