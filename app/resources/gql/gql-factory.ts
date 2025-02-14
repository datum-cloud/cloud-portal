import { createGraphqlClient } from '@/modules/graphql/graphql'
import { createOrganizationGql, OrganizationGql } from './organization.gql'
import { createUserGql, UserGql } from './user.gql'

export interface GqlFactory {
  organizationGql: OrganizationGql
  userGql: UserGql
}

export const createGqlFactory = (authToken: string): GqlFactory => {
  const gqlClient = createGraphqlClient({
    baseURL: `${process.env.API_URL}/datum-os/query`,
    authToken,
  })

  return {
    organizationGql: createOrganizationGql(gqlClient),
    userGql: createUserGql(gqlClient),
  }
}
