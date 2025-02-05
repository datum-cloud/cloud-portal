export interface IGoogleProfile {
  sub: string
  name: string
  given_name: string
  family_name: string
  picture: string
  email: string
}

export interface IUser {
  id: string
  email: string
  fullName: string
  firstName: string
  lastName: string
  avatar: string
  accessToken: string
  refreshToken: string
  internal: boolean
  organization: string
  sub: string
  userId: string
  userEntityId: string
}

export interface IUserSetting {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  user_entity_id: string
  mapping_id: string
  user_id: string
  status: 'ACTIVE' | 'INACTIVE'
  ui_theme: 'LIGHT' | 'DARK'
  edges: Record<string, never>
}

export interface IUserEdges {
  setting: IUserSetting
}

export interface IUserProfile {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  user_entity_id: string
  mapping_id: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  avatar_remote_url: string
  avatar_updated_at: string
  last_seen: string
  sub: string
  auth_provider: string
  role: string
  internal: boolean
  edges: IUserEdges
}
