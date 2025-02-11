import { withMiddleware } from '@/modules/middleware/middleware'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { routes } from '@/constants/routes'
import { redirect } from 'react-router'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ params }) => {
  const { orgId } = params

  if (!orgId) {
    throw new Response('No organization ID found', { status: 401 })
  }

  // TODO: change to the org root when the dashboard is ready
  const path = getPathWithParams(routes.projects.root, { orgId })
  return redirect(path)
}, authMiddleware)
