import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { data } from 'react-router'
import { getSession } from '@/modules/auth/auth-session.server'
import { OrganizationModel } from '@/resources/gql/models/organization.model'

export const ROUTE_PATH = '/api/projects/list' as const

export const loader = withMiddleware(async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'))
  const org: OrganizationModel = session.get('currentOrg')

  const projects = await projectsControl.getProjects(org.userEntityID, request)
  return data(projects)
}, authMiddleware)
