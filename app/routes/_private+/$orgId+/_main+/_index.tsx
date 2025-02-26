import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { getPathWithParams } from '@/utils/path'
import { redirect } from 'react-router'

export const loader = withMiddleware(async ({ params }) => {
  const { orgId } = params

  // TODO: change to the org root when the dashboard is ready
  const path = getPathWithParams(routes.org.projects.root, { orgId })
  return redirect(path)
}, authMiddleware)
