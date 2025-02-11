import { getSession } from '@/modules/auth/auth-session.server'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import {
  OrganizationModel,
  OrganizationMemberModel,
} from '@/resources/gql/models/organization.model'
import { organizationGql } from '@/resources/gql/organization.gql'
import { data } from 'react-router'

export const ROUTE_PATH = '/api/organizations/list' as const

export const loader = withMiddleware(async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  const organizations = await organizationGql.getAllOrganizations(request)
  const filtered = organizations.filter((org: OrganizationModel) =>
    org.members.some((member: OrganizationMemberModel) => member.user.id === userId),
  )

  return data(filtered)
}, authMiddleware)
