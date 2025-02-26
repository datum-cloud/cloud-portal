import { OrganizationGql, createOrganizationGql } from './organization.gql'
import { UserGql, createUserGql } from './user.gql'
import { createGraphqlClient } from '@/modules/graphql/graphql'

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
