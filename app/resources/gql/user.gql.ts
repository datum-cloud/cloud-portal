import { GraphqlClient } from '@/modules/graphql/graphql'
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

// When importing userGql in a server-side function, each function call will create
// a new instance of UserGql. So calling userGql twice in the same function will
// create two separate instances. To reuse the same instance within a function,
// store it in a variable:
//
// Example:
// async function myFunction() {
//   const gqlClient = userGql; // First initialization
//   await gqlClient.getUserProfile(...);
//   await gqlClient.getUserProfile(...); // Reuses same instance
// }
export const userGql = new UserGql()
