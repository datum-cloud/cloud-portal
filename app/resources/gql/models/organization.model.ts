import { types } from 'typed-graphqlify'

export const OrganizationMemberModel = {
  id: types.string,
  role: types.string,
  user: {
    id: types.string,
    firstName: types.string,
    lastName: types.string,
  },
}

export const OrganizationModel = {
  id: types.string,
  userEntityID: types.string,
  name: types.string,
  displayName: types.string,
  description: types.string,
  personalOrg: types.boolean,
  tags: [types.string],
  verificationState: types.string,
  members: [OrganizationMemberModel],
  createdAt: types.string,
  updatedAt: types.string,
}

export type OrganizationMemberModel = typeof OrganizationMemberModel
export type OrganizationModel = typeof OrganizationModel
