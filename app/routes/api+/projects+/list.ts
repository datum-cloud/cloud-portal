import { getSession } from '@/modules/auth/authSession.server'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'

import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/projects/list' as const

export const loader = withMiddleware(async ({ request, context }) => {
  const { projectsControl } = context as AppLoadContext
  const session = await getSession(request.headers.get('Cookie'))
  const orgEntityId: string = session.get('currentOrgEntityID')

  const projects = await projectsControl.getProjects(orgEntityId)
  return data(projects)
}, authMiddleware)
