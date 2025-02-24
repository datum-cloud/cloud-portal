import { withMiddleware } from '@/modules/middleware/middleware'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { routes } from '@/constants/routes'
import { redirect } from 'react-router'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ params }) => {
  const { orgId } = params

  // TODO: change to the org root when the dashboard is ready
  const path = getPathWithParams(routes.org.projects.root, { orgId })
  return redirect(path)
}, authMiddleware)
