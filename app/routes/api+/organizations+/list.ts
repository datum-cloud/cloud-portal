import { getSession } from '@/modules/auth/auth-session.server'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import {
  OrganizationModel,
  OrganizationMemberModel,
} from '@/resources/gql/models/organization.model'
import { data, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/organizations/list' as const

export const loader = withMiddleware(async ({ request, context }) => {
  const { organizationGql } = context as AppLoadContext
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  const organizations = await organizationGql.getAllOrganizations()
  const filtered = organizations.filter((org: OrganizationModel) =>
    org.members.some((member: OrganizationMemberModel) => member.user.id === userId),
  )

  return data(filtered)
}, authMiddleware)
