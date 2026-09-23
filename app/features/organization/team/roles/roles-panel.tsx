import { RoleRow } from './role-row';
import type { UserRoleAssignment, PendingChange } from './roles-editor.types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Building2Icon, FolderIcon, KeyRoundIcon, PlusIcon } from 'lucide-react';

type RolesPanelProps = {
  assignments: UserRoleAssignment[];
  pendingChanges: PendingChange[];
  canManageRoles: boolean;
  onRemove: (assignment: UserRoleAssignment) => void;
  onAddRole: () => void;
};

type AssignmentGroup = {
  kind: 'org' | 'project';
  label: string;
  scopeName: string;
  items: UserRoleAssignment[];
};

function groupAssignments(assignments: UserRoleAssignment[]): AssignmentGroup[] {
  const orgItems: UserRoleAssignment[] = [];
  const projectMap = new Map<string, AssignmentGroup>();

  for (const assignment of assignments) {
    if (assignment.scope.kind === 'org') {
      orgItems.push(assignment);
    } else {
      const key = assignment.scope.projectId;
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          kind: 'project',
          label: 'Project',
          scopeName: assignment.scope.projectDisplayName,
          items: [],
        });
      }
      projectMap.get(key)!.items.push(assignment);
    }
  }

  const groups: AssignmentGroup[] = [];

  if (orgItems.length > 0) {
    const orgScope = orgItems[0].scope;
    groups.push({
      kind: 'org',
      label: 'Organization',
      scopeName: orgScope.kind === 'org' ? orgScope.orgDisplayName : '',
      items: orgItems,
    });
  }

  for (const group of projectMap.values()) {
    groups.push(group);
  }

  return groups;
}

export function RolesPanel({
  assignments,
  pendingChanges,
  canManageRoles,
  onRemove,
  onAddRole,
}: RolesPanelProps) {
  const groups = groupAssignments(assignments);

  return (
    <section aria-label="Roles" className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon icon={KeyRoundIcon} className="text-primary size-[18px]" />
          <Title as="h2" level={7} weight="semibold" textColor="default">
            Assigned Roles
          </Title>
          <Text
            size="xs"
            weight="semibold"
            textColor="muted"
            className="bg-muted rounded-full px-2 py-0.5">
            {assignments.length}
          </Text>
        </div>
        {canManageRoles ? (
          <Button type="primary" size="small" onClick={onAddRole} aria-label="Add role">
            <Icon icon={PlusIcon} className="size-3.5" />
            Add Role
          </Button>
        ) : (
          <Tooltip message="You don't have permission to manage roles" side="left">
            <span>
              <Button type="primary" size="small" disabled aria-label="Add role">
                <Icon icon={PlusIcon} className="size-3.5" />
                Add Role
              </Button>
            </span>
          </Tooltip>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {assignments.length === 0 ? (
          <Text as="p" textColor="muted" className="px-6 py-6 text-center">
            No roles assigned. Click &ldquo;Add Role&rdquo; to get started.
          </Text>
        ) : (
          <div>
            {groups.map((group) => (
              <div key={`${group.kind}-${group.scopeName}`}>
                <div className="bg-muted/50 flex items-center gap-2 px-6 py-2.5">
                  <Icon
                    icon={group.kind === 'org' ? Building2Icon : FolderIcon}
                    className="text-muted-foreground size-3.5"
                  />
                  <Text size="3xs" weight="semibold" textColor="muted" className="tracking-wide">
                    {group.label}
                  </Text>
                  <Text size="3xs" textColor="muted">
                    /
                  </Text>
                  <Text size="3xs" weight="semibold" textColor="default">
                    {group.scopeName}
                  </Text>
                  {group.kind === 'org' && (
                    <Text size="4xs" weight="medium" textColor="muted" className="ml-auto">
                      Inherited by all projects
                    </Text>
                  )}
                  {group.kind === 'project' && (
                    <Text
                      size="4xs"
                      weight="semibold"
                      textColor="muted"
                      className="bg-muted ml-auto rounded-md px-1.5 py-0.5">
                      {group.items.length}
                    </Text>
                  )}
                </div>
                <ul>
                  {group.items.map((assignment) => {
                    const isPendingRemove = pendingChanges.some(
                      (c) => c.op === 'remove' && c.assignmentId === assignment.id
                    );
                    return (
                      <li key={assignment.id}>
                        <RoleRow
                          assignment={assignment}
                          isPendingRemove={isPendingRemove}
                          canManageRoles={canManageRoles}
                          onRemove={() => onRemove(assignment)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
