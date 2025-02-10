import { types } from 'typed-graphqlify'

export const UserModel = {
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

export type UserModel = typeof UserModel
