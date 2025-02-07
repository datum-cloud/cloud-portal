import { GraphqlClient } from '@/modules/graphql/graphql.server'

export class ProfileGql extends GraphqlClient {
  async getUserProfile(id: string) {
    const query = `query GetUserProfile($userId: ID!) {
      user(id: $userId) {
        id
        firstName
        lastName
        displayName
        email
        avatarRemoteURL
        avatarLocalFile
        authProvider
        createdAt
        lastSeen
        setting {
          status
          tags
          uiTheme
        }
      }
    }`

    const result = await this.request(query, {
      userId: id,
    })
    return result
  }
}

export const profileGql = new ProfileGql()
