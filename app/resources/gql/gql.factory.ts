import { createGraphqlClient, GraphqlClient } from '@/modules/graphql/graphql'

export const createGqlFactory = (authToken: string): GraphqlClient => {
  const gqlClient = createGraphqlClient({
    baseURL: `${process.env.API_URL}/datum-os/query`,
    authToken,
  })

  return gqlClient
}

export type GqlFactory = ReturnType<typeof createGqlFactory>
