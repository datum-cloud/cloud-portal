import { redirect } from 'react-router'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { routes } from '@/constants/routes'
import { getSession } from '@/modules/auth/auth-session.server'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'))
  const orgId = session.get('currentOrgId')

  if (!orgId) {
    throw new Response('No organization ID found', { status: 401 })
  }

  const path = getPathWithParams(routes.org.root, { orgId })
  return redirect(path)
}, authMiddleware)
