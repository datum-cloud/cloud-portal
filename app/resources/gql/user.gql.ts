import { GraphqlClient } from '@/modules/graphql/graphql'
import { alias, query as typedQuery } from 'typed-graphqlify'
import { UserModel } from './models/user.model'

export const createUserGql = (client: GraphqlClient) => {
  return {
    getUserProfile: async (id: string) => {
      const query = typedQuery('GetUserProfile($userId: ID!)', {
        [alias('user', 'user(id: $userId)')]: UserModel,
      })

      const data = await client.request(query.toString(), { userId: id })
      return data.user
    },
  }
}

export type UserGql = ReturnType<typeof createUserGql>
