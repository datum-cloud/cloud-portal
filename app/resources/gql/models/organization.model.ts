import { types } from 'typed-graphqlify'

export const organizationMemberModel = {
  id: types.string,
  role: types.string,
  user: {
    id: types.string,
    firstName: types.string,
    lastName: types.string,
    avatarRemoteURL: types.string,
  },
}

export const organizationModel = {
  id: types.string,
  userEntityID: types.string,
  name: types.string,
  avatarRemoteURL: types.string,
  displayName: types.string,
  description: types.string,
  personalOrg: types.boolean,
  tags: [types.string],
  verificationState: types.string,
  members: [organizationMemberModel],
  createdAt: types.string,
  updatedAt: types.string,
}

export type OrganizationMemberModel = typeof organizationMemberModel
export type OrganizationModel = typeof organizationModel
