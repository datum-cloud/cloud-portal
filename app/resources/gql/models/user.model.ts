import { types } from 'typed-graphqlify'

export const userModel = {
  id: types.string,
  firstName: types.string,
  lastName: types.string,
  displayName: types.string,
  email: types.string,
  avatarRemoteURL: types.string,
  avatarLocalFile: types.string,
  authProvider: types.string,
  createdAt: types.string,
  lastSeen: types.string,
}

export const userApiKeyModel = {
  id: types.string,
  description: types.string,
  expiresAt: types.string,
  lastUsedAt: types.string,
  name: types.string,
  scopes: types.string,
  token: types.string,
  updatedAt: types.string,
  updatedBy: types.string,
  createdAt: types.string,
  organizations: [
    {
      id: types.string,
      name: types.string,
    },
  ],
}

export type UserModel = typeof userModel
export type UserApiKeyModel = typeof userApiKeyModel
