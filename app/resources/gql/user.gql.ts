import { GraphqlClient } from '@/modules/graphql/graphql'
import { alias, mutation, query as typedQuery, types } from 'typed-graphqlify'
import { userApiKeyModel, userModel } from './models/user.model'
import { NewApiKeySchema } from '../schemas/api-key.schema'

export const createUserGql = (client: GraphqlClient) => {
  return {
    getUserProfile: async (id: string) => {
      const query = typedQuery('GetUserProfile($userId: ID!)', {
        [alias('user', 'user(id: $userId)')]: userModel,
      })

      const data = await client.request(query.toString(), { userId: id })
      return data.user
    },
    getUserApiKeys: async () => {
      const query = typedQuery('GetAllPersonalAccessTokens', {
        [alias('personalAccessTokens', 'personalAccessTokens')]: {
          edges: [
            {
              node: userApiKeyModel,
            },
          ],
        },
      })

      const data = await client.request(query.toString())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.personalAccessTokens.edges.map((edge: any) => edge.node)
    },
    createApiKey: async (payload: NewApiKeySchema) => {
      const query = mutation(
        'CreatePersonalAccessToken($input: CreatePersonalAccessTokenInput!)',
        {
          [alias(
            'createPersonalAccessToken',
            'createPersonalAccessToken(input: $input)',
          )]: {
            personalAccessToken: {
              token: types.string,
            },
          },
        },
      )

      const data = await client.request(query.toString(), {
        input: {
          name: payload.name,
          description: payload.description,
          expiresAt: payload.expiresAt,
          ownerID: payload.ownerId,
          organizationIDs: payload.orgIds,
        },
      })
      return data.createPersonalAccessToken.personalAccessToken
    },
    deleteUserApiKey: async (apiKeyId: string) => {
      const query = mutation(
        'DeletePersonalAccessToken($deletePersonalAccessTokenId: ID!)',
        {
          [alias(
            'deletePersonalAccessToken',
            'deletePersonalAccessToken(id: $deletePersonalAccessTokenId)',
          )]: {
            deletedID: types.string,
          },
        },
      )

      const data = await client.request(query.toString(), {
        deletePersonalAccessTokenId: apiKeyId,
      })

      return data.deletePersonalAccessToken.deletedID
    },
  }
}

export type UserGql = ReturnType<typeof createUserGql>
