import type { Role } from '@/resources/roles';

export type RoleScope =
  | { kind: 'org'; orgId: string; orgDisplayName: string }
  | {
      kind: 'project';
      projectId: string;
      projectDisplayName: string;
      policyBindingName: string;
    };

export type UserRoleAssignment = {
  id: string;
  role: Role;
  scope: RoleScope;
  membershipName?: string;
};

export type PendingAdd = {
  op: 'add';
  role: Role;
  scope: RoleScope;
};

export type PendingRemove = {
  op: 'remove';
  assignmentId: string;
  role: Role;
  scope: RoleScope;
};

export type PendingChange = PendingAdd | PendingRemove;

export type EditorState = {
  serverAssignments: UserRoleAssignment[];
  pendingChanges: PendingChange[];
  selectedAssignmentId: string | null;
  addRoleOpen: boolean;
  addRoleScopeFilter: 'org' | string;
};
