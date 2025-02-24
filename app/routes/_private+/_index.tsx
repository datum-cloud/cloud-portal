import { redirect } from 'react-router'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { routes } from '@/constants/routes'
import { getSession } from '@/modules/auth/authSession.server'
import { getPathWithParams } from '@/utils/path'
import { CustomError } from '@/utils/errorHandle'

export const loader = withMiddleware(async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'))
  const orgId = session.get('currentOrgId')

  if (!orgId) {
    throw new CustomError('No organization ID found', 404)
  }

  // TODO: change to the org root when the dashboard is ready
  // Redirect to the organization root
  return redirect(getPathWithParams(routes.org.projects.root, { orgId }))
}, authMiddleware)
