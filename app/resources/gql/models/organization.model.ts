import { types } from 'typed-graphqlify'

export const OrganizationModel = {
  id: types.string,
  userEntityID: types.string,
  name: types.string,
  displayName: types.string,
  description: types.string,
  personalOrg: types.boolean,
  tags: [types.string],
  verificationState: types.string,
  createdAt: types.string,
  updatedAt: types.string,
}

export type OrganizationModel = typeof OrganizationModel
