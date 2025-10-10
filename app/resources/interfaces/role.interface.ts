export enum Roles {
  Owner = 'owner',
  Viewer = 'viewer',
}

export const RoleLabels: Record<Roles, string> = {
  [Roles.Owner]: 'Owner',
  [Roles.Viewer]: 'Viewer',
};
