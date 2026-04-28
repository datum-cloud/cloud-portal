import { PermissionsPanel } from './permissions-panel';
import type { RoleScope, UserRoleAssignment } from './roles-editor.types';
import { resolveAllPermissions } from './utils';
import type { Role } from '@/resources/roles';
import { useRole } from '@/resources/roles';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowLeftIcon, BuildingIcon, FolderIcon, SearchIcon } from 'lucide-react';
import { useState, useMemo } from 'react';

type ScopeOption =
  | { kind: 'org'; orgId: string; orgDisplayName: string }
  | { kind: 'project'; projectId: string; projectDisplayName: string };

type AddRoleScreenProps = {
  roles: Role[];
  scopes: ScopeOption[];
  existingPermissions?: string[];
  existingAssignments?: UserRoleAssignment[];
  onAdd: (role: Role, scope: RoleScope) => void;
  onCancel: () => void;
};

const TAXONOMY_PRODUCT = 'taxonomy.miloapis.com/product';
const TAXONOMY_SORT_ORDER = 'taxonomy.miloapis.com/sort-order';
const UNGROUPED_LABEL = 'Other';

function groupRoles(roles: Role[]): Array<{ label: string; roles: Role[] }> {
  type Group = {
    label: string;
    sortOrder: number;
    roles: Array<{ role: Role; sortOrder: number }>;
  };
  const groupMap = new Map<string, Group>();

  for (const role of roles) {
    const product = role.annotations?.[TAXONOMY_PRODUCT] ?? UNGROUPED_LABEL;
    const sortOrder = parseInt(role.annotations?.[TAXONOMY_SORT_ORDER] ?? '9999', 10);

    if (!groupMap.has(product)) {
      groupMap.set(product, { label: product, sortOrder, roles: [] });
    }
    const group = groupMap.get(product)!;
    if (sortOrder < group.sortOrder) group.sortOrder = sortOrder;
    group.roles.push({ role, sortOrder });
  }

  return Array.from(groupMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ label, roles }) => ({
      label,
      roles: roles.sort((a, b) => a.sortOrder - b.sortOrder).map((r) => r.role),
    }));
}

// Resources that only make sense at the organization level.
// Roles whose permissions exclusively target these resources are hidden for project scopes.
const ORG_ONLY_RESOURCES = new Set([
  'organizations',
  'organizationmemberships',
  'groups',
  'groupmemberships',
]);

function isRelevantForScope(role: Role, scope: ScopeOption): boolean {
  // All roles are relevant at org scope (org roles inherit down to projects)
  if (scope.kind === 'org') return true;

  const permissions = role.includedPermissions ?? [];
  // Roles with no declared permissions (e.g. aggregate roles) are shown everywhere
  if (permissions.length === 0) return true;

  // If every permission targets an org-only resource, hide for project scope
  const allOrgOnly = permissions.every((p) => {
    const slashIndex = p.indexOf('/');
    const afterSlash = slashIndex !== -1 ? p.slice(slashIndex + 1) : p;
    const dotIndex = afterSlash.lastIndexOf('.');
    const resource = dotIndex !== -1 ? afterSlash.slice(0, dotIndex) : afterSlash;
    return ORG_ONLY_RESOURCES.has(resource);
  });
  return !allOrgOnly;
}

function scopeToRoleScope(scope: ScopeOption): RoleScope {
  if (scope.kind === 'org') {
    return { kind: 'org', orgId: scope.orgId, orgDisplayName: scope.orgDisplayName };
  }
  return {
    kind: 'project',
    projectId: scope.projectId,
    projectDisplayName: scope.projectDisplayName,
    policyBindingName: '',
  };
}

export function AddRoleScreen({
  roles,
  scopes,
  existingPermissions,
  existingAssignments = [],
  onAdd,
  onCancel,
}: AddRoleScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedScopeIndex, setSelectedScopeIndex] = useState(0);

  const selectedScope = scopes[selectedScopeIndex] ?? scopes[0];

  const { data: fetchedRole, isFetching: isFetchingRole } = useRole(
    selectedRole?.name ?? '',
    selectedRole?.namespace ?? 'datum-cloud',
    { enabled: !!selectedRole }
  );

  const resolvedPermissions = useMemo(
    () => (fetchedRole ? resolveAllPermissions(fetchedRole, roles) : []),
    [fetchedRole, roles]
  );

  // Build a set of role names already assigned at the selected scope
  const assignedRoleNames = useMemo(
    () =>
      new Set(
        existingAssignments
          .filter((a) => {
            if (selectedScope.kind === 'org' && a.scope.kind === 'org') return true;
            if (
              selectedScope.kind === 'project' &&
              a.scope.kind === 'project' &&
              selectedScope.projectId === a.scope.projectId
            )
              return true;
            return false;
          })
          .map((a) => a.role.name)
      ),
    [existingAssignments, selectedScope]
  );

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      // #1 — Scope relevance: hide org-only roles when a project scope is selected
      if (!isRelevantForScope(r, selectedScope)) return false;
      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          (r.displayName ?? r.name).toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [roles, search, selectedScope]);

  const groups = useMemo(() => groupRoles(filteredRoles), [filteredRoles]);

  const handleAdd = () => {
    if (!selectedRole || !selectedScope) return;
    onAdd(selectedRole, scopeToRoleScope(selectedScope));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="add-role-screen">
      {/* Panels — height bounded to viewport so panels scroll independently */}
      <div className="flex flex-1 flex-col overflow-hidden md:h-[calc(100svh-240px)] md:flex-row">
        {/* Left: role picker */}
        <section
          aria-label="Add a Role"
          className="flex max-h-[50vh] flex-col overflow-hidden border-b md:max-h-none md:w-2/5 md:border-r md:border-b-0">
          {/* Header: back + title + scope */}
          <header className="border-b px-6 pt-5 pb-4">
            <Button
              type="secondary"
              theme="outline"
              size="xs"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground mb-3 -ml-2">
              <Icon icon={ArrowLeftIcon} className="size-4" />
              Back to roles
            </Button>
            <h2 className="text-foreground mb-3 text-lg font-bold tracking-tight">Add a Role</h2>

            {/* Scope selector */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="scope-select"
                className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                Grant at scope
              </label>
              <Select
                value={String(selectedScopeIndex)}
                onValueChange={(v) => {
                  setSelectedScopeIndex(Number(v));
                  setSelectedRole(null);
                }}>
                <SelectTrigger id="scope-select">
                  <Icon
                    icon={selectedScope?.kind === 'org' ? BuildingIcon : FolderIcon}
                    className="text-muted-foreground size-3.5 shrink-0"
                  />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopes.map((scope, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {scope.kind === 'org'
                        ? `Organization / ${scope.orgDisplayName}`
                        : `Project / ${scope.projectDisplayName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>

          {/* Search */}
          <div className="border-b px-6 py-3">
            <div className="relative">
              <Icon
                icon={SearchIcon}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              />
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-9 text-sm"
                aria-label="Search roles"
              />
            </div>
          </div>

          {/* Role list */}
          <div className="flex-1 overflow-y-auto py-2">
            {groups.length === 0 ? (
              <p className="text-muted-foreground px-6 py-6 text-center text-sm">No roles found.</p>
            ) : (
              <ul>
                {groups.map((group) => (
                  <li key={group.label}>
                    <div className="flex items-center gap-2 px-6 py-2">
                      <span className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                        {group.label}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {group.roles.length}
                      </span>
                    </div>
                    <ul>
                      {group.roles.map((role) => {
                        const isAssigned = assignedRoleNames.has(role.name);
                        const isSelected = selectedRole?.name === role.name;
                        return (
                          <li key={role.name}>
                            <button
                              type="button"
                              onClick={() => !isAssigned && setSelectedRole(role)}
                              disabled={isAssigned}
                              aria-pressed={isSelected}
                              className={cn(
                                'flex w-full items-center gap-2 px-6 py-2.5 text-left text-sm transition-colors',
                                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                                isAssigned
                                  ? 'cursor-default opacity-50'
                                  : isSelected
                                    ? 'bg-primary/10'
                                    : 'hover:bg-muted'
                              )}>
                              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span
                                  className={cn(
                                    'text-sm font-medium',
                                    isSelected ? 'text-foreground font-semibold' : 'text-foreground'
                                  )}>
                                  {role.displayName ?? role.name}
                                </span>
                                {role.description && (
                                  <span className="text-muted-foreground text-xs">
                                    {role.description}
                                  </span>
                                )}
                              </div>
                              {isAssigned && (
                                <span className="text-muted-foreground shrink-0 text-[10px] font-semibold tracking-wide uppercase">
                                  Assigned
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: permissions preview */}
        <section
          aria-label="Role Preview"
          className="bg-card flex flex-col overflow-hidden border-t md:w-3/5 md:border-t-0 md:border-l">
          <header className="border-b px-6 py-4">
            <h2 className="text-foreground text-[15px] font-semibold">
              {selectedRole ? (selectedRole.displayName ?? selectedRole.name) : 'Role Preview'}
            </h2>
            {selectedRole?.description && (
              <p className="text-muted-foreground mt-0.5 text-xs">{selectedRole.description}</p>
            )}
          </header>
          <div className="flex-1 overflow-y-auto">
            {isFetchingRole ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Loading permissions...
              </div>
            ) : (
              <PermissionsPanel
                permissions={resolvedPermissions}
                existingPermissions={existingPermissions}
              />
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="secondary" size="small" onClick={onCancel}>
          Discard
        </Button>
        <Button
          type="primary"
          size="small"
          disabled={!selectedRole}
          onClick={handleAdd}
          aria-label={
            selectedRole ? `Add role ${selectedRole.displayName ?? selectedRole.name}` : 'Add role'
          }>
          Add Role
        </Button>
      </div>
    </div>
  );
}
