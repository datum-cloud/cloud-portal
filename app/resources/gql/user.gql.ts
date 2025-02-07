import { GraphqlClient } from '@/modules/graphql/graphql.server'
import { UserModel } from '@/resources/gql/models/user.model'
import { query as typedQuery, alias } from 'typed-graphqlify'

export class UserGql extends GraphqlClient {
  async getUserProfile(id: string, request?: Request): Promise<UserModel> {
    // Set auth token from request session if provided
    if (request) {
      await this.setToken(request)
    }

    const query = typedQuery('GetUserProfile($userId: ID!)', {
      [alias('user', 'user(id: $userId)')]: UserModel,
    })

    const data = await this.request(query.toString(), { userId: id })
    return data.user
  }
}

export const userGql = new UserGql()
