export enum Roles {
  Owner = 'owner',
  Viewer = 'viewer',
}

export const RoleLabels: Record<Roles, string> = {
  [Roles.Owner]: 'Owner',
  [Roles.Viewer]: 'Viewer',
};

export interface IRoleControlResponse {
  name: string;
  createdAt: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  displayName?: string;
  description?: string;
}
