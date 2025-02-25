import { getSession } from '@/modules/auth/authSession.server'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'

import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/projects/list' as const

export const loader = withMiddleware(async ({ request, context }) => {
  const { projectsControl, cache } = context as AppLoadContext

  const session = await getSession(request.headers.get('Cookie'))
  const orgEntityId: string = session.get('currentOrgEntityID')

  const key = `projects:${orgEntityId}`
  const isCached = await cache.hasItem(key)

  if (isCached) {
    const projects = await cache.getItem(key)
    return data(projects)
  }

  const projects = await projectsControl.getProjects(orgEntityId)

  await cache.setItem(key, projects)

  return data(projects)
}, authMiddleware)
