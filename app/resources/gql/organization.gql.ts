import { GraphqlClient } from '@/modules/graphql/graphql'
import { OrganizationModel } from './models/organization.model'
import { alias, query as typedQuery } from 'typed-graphqlify'

export const createOrganizationGql = (client: GraphqlClient) => {
  return {
    getAllOrganizations: async () => {
      const query = typedQuery('GetAllOrganizations', {
        [alias('organizations', 'organizations')]: {
          edges: [
            {
              node: OrganizationModel,
            },
          ],
        },
      })

      const data = await client.request(query.toString())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.organizations.edges.map((edge: any) => edge.node)
    },
    getOrganizationDetail: async (id: string) => {
      const query = typedQuery('GetOrganizationDetail($organizationId: ID!)', {
        [alias('organization', 'organization(id: $organizationId)')]: OrganizationModel,
      })

      const data = await client.request(query.toString(), { organizationId: id })
      return data.organization
    },
  }
}

export type OrganizationGql = ReturnType<typeof createOrganizationGql>
