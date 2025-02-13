import { GraphqlClient } from '@/modules/graphql/graphql'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { alias, query as typedQuery } from 'typed-graphqlify'

export class OrganizationGql extends GraphqlClient {
  async getAllOrganizations(request?: Request) {
    // Set auth token from request session if provided
    if (request) {
      await this.setToken(request)
    }

    const query = typedQuery('GetAllOrganizations', {
      [alias('organizations', 'organizations')]: {
        edges: [
          {
            node: OrganizationModel,
          },
        ],
      },
    })

    const data = await this.request(query.toString())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.organizations.edges.map((edge: any) => edge.node)
  }

  async getOrganizationDetail(id: string, request?: Request) {
    // Set auth token from request session if provided
    if (request) {
      await this.setToken(request)
    }

    const query = typedQuery('GetOrganizationDetail($organizationId: ID!)', {
      [alias('organization', 'organization(id: $organizationId)')]: OrganizationModel,
    })

    const data = await this.request(query.toString(), { organizationId: id })
    return data.organization
  }
}

export const organizationGql = new OrganizationGql()
