import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { organizationGql } from '@/resources/gql/organization.gql'
import { data } from 'react-router'

export const ROUTE_PATH = '/api/organization/list' as const

export const loader = withMiddleware(async ({ request }) => {
  const organizations = await organizationGql.getAllOrganizations(request)
  return data(organizations)
}, authMiddleware)
