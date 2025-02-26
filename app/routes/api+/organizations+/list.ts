import { getSession } from '@/modules/auth/authSession.server'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import {
  OrganizationMemberModel,
  OrganizationModel,
} from '@/resources/gql/models/organization.model'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/organizations/list' as const

export const loader = withMiddleware(async ({ request, context }) => {
  const { organizationGql, cache } = context as AppLoadContext

  const isCached = await cache.hasItem('organizations')
  if (isCached) {
    const organizations = await cache.getItem('organizations')
    return data(organizations)
  }

  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  const organizations = await organizationGql.getAllOrganizations()
  const filtered = organizations.filter((org: OrganizationModel) =>
    org.members.some((member: OrganizationMemberModel) => member.user.id === userId),
  )

  await cache.setItem('organizations', filtered)
  return data(filtered)
}, authMiddleware)
