import { GroupHeader } from '@/features/organization/team/group-header';
import type { UserRoleAssignment, PendingRemove } from '@/features/organization/team/roles';
import {
  useRolesEditor,
  RolesPanel,
  PermissionsPanel,
  ActionBar,
  AddRoleScreen,
  resolveAllPermissions,
} from '@/features/organization/team/roles';
import { logger } from '@/modules/logger';
import { createRbacMiddleware, RbacService } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { createGroupService } from '@/resources/groups';
import {
  createPolicyBindingService,
  useCreatePolicyBinding,
  useDeletePolicyBinding,
} from '@/resources/policy-bindings';
import { createProjectService } from '@/resources/projects';
import { createRoleService } from '@/resources/roles';
import { buildOrganizationNamespace } from '@/utils/common';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { withMiddleware } from '@/utils/middlewares';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useState, useMemo } from 'react';
import {
  LoaderFunctionArgs,
  data,
  useLoaderData,
  useParams,
  type MetaFunction,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Group Roles');
});

const _loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId, groupId } = params as { orgId: string; groupId: string };

  const groupResult = await createGroupService()
    .get(orgId, groupId)
    .catch(() => null);

  if (!groupResult) {
    throw data({ message: 'Group not found' }, { status: 404 });
  }

  const [roles, policyBindings, projectsList, canManageRoles] = await Promise.all([
    createRoleService().list('datum-cloud'),
    createPolicyBindingService()
      .list(orgId)
      .catch(
        () => [] as Awaited<ReturnType<ReturnType<typeof createPolicyBindingService>['list']>>
      ),
    createProjectService()
      .list(orgId)
      .catch(() => ({
        items: [] as Awaited<ReturnType<ReturnType<typeof createProjectService>['list']>>['items'],
      })),
    new RbacService()
      .checkPermission(orgId, {
        resource: 'policybindings',
        verb: 'create',
        group: 'iam.miloapis.com',
        namespace: buildOrganizationNamespace(orgId),
      })
      .then((r) => r.allowed && !r.denied)
      .catch(() => false),
  ]);

  return data({
    group: groupResult,
    roles,
    policyBindings,
    projects: projectsList.items,
    canManageRoles,
  });
};

export const loader = withMiddleware(
  _loader,
  createRbacMiddleware({
    resource: 'policybindings',
    verb: 'list',
    group: 'iam.miloapis.com',
    namespace: (params) => buildOrganizationNamespace(params.orgId),
  })
);

export default function GroupDetailPage() {
  const { group, roles, policyBindings, projects, canManageRoles } =
    useLoaderData<typeof _loader>();
  const { orgId } = useParams() as { orgId: string };
  const { organization } = useApp();
  const orgDisplayName = organization?.displayName ?? orgId;

  const initialAssignments = useMemo<UserRoleAssignment[]>(() => {
    const assignments: UserRoleAssignment[] = [];

    for (const binding of policyBindings) {
      const isGroupSubject = binding.subjects.some(
        (s) => s.kind === 'Group' && (s.name === group.name || s.uid === group.uid)
      );
      if (!isGroupSubject) continue;

      const refKind = binding.resourceSelector?.resourceRef?.kind;
      const roleName = binding.roleRef?.name ?? '';
      const resolvedRole = roles.find((r) => r.name === roleName) ?? {
        uid: '',
        name: roleName,
        namespace: binding.roleRef?.namespace ?? '',
        resourceVersion: '',
        createdAt: '',
        displayName: roleName,
        includedPermissions: [],
        inheritedRoles: [],
      };

      if (refKind === 'Project') {
        const projectId = binding.resourceSelector?.resourceRef?.name ?? '';
        const project = projects.find((p) => p.name === projectId);
        assignments.push({
          id: `project-${binding.name}-${roleName}`,
          role: resolvedRole,
          scope: {
            kind: 'project',
            projectId,
            projectDisplayName: project?.displayName ?? projectId,
            policyBindingName: binding.name,
          },
        });
      } else {
        // Organization scope (kind === 'Organization' or absent — treat as org-scope defensively)
        if (refKind !== 'Organization') {
          logger.warn(
            `[group-detail] PolicyBinding ${binding.name} has unexpected resourceRef kind: ${refKind ?? 'absent'} — treating as org-scope`
          );
        }
        assignments.push({
          id: `org-${binding.name}-${roleName}`,
          role: resolvedRole,
          scope: { kind: 'org', orgId, orgDisplayName: orgDisplayName ?? orgId },
          membershipName: binding.name,
        });
      }
    }

    return assignments;
  }, [group, roles, policyBindings, orgId, orgDisplayName]);

  const {
    state,
    dispatch,
    visibleAssignments,
    effectiveAssignments,
    addCount,
    removeCount,
    pendingCount,
  } = useRolesEditor(initialAssignments);

  // Permissions for all currently effective (non-removed) assignments
  const effectivePermissions = useMemo(() => {
    const perms = effectiveAssignments.flatMap((a) => resolveAllPermissions(a.role, roles));
    return [...new Set(perms)];
  }, [effectiveAssignments, roles]);

  // Permissions that will be lost when pending-remove roles are saved
  // Only include permissions not covered by any remaining role
  const losingPermissions = useMemo(() => {
    const removedAssignmentIds = new Set(
      state.pendingChanges.filter((c) => c.op === 'remove').map((c) => c.assignmentId)
    );
    const removingPerms = new Set(
      state.pendingChanges
        .filter((c) => c.op === 'remove')
        .flatMap((c) => resolveAllPermissions(c.role, roles))
    );
    const remainingPerms = new Set(
      effectiveAssignments
        .filter((a) => !removedAssignmentIds.has(a.id))
        .flatMap((a) => resolveAllPermissions(a.role, roles))
    );
    return [...removingPerms].filter((p) => !remainingPerms.has(p));
  }, [state.pendingChanges, effectiveAssignments, roles]);

  const createPolicyBinding = useCreatePolicyBinding(orgId);
  const deletePolicyBinding = useDeletePolicyBinding(orgId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allPendingChanges = state.pendingChanges;

      const results = await Promise.allSettled(
        allPendingChanges.map((change) => {
          if (change.op === 'add') {
            const isOrgScope = change.scope.kind === 'org';
            const resourceRef = isOrgScope
              ? {
                  ref: 'resourcemanager.miloapis.com-organization',
                  name: orgId,
                  uid: organization?.uid,
                }
              : {
                  ref: 'resourcemanager.miloapis.com-project',
                  name: (change.scope as { kind: 'project'; projectId: string }).projectId,
                  uid: projects.find(
                    (p) =>
                      p.name === (change.scope as { kind: 'project'; projectId: string }).projectId
                  )?.uid,
                };

            return createPolicyBinding.mutateAsync({
              resource: resourceRef,
              role: change.role.name,
              roleNamespace: change.role.namespace,
              subjects: [{ kind: 'Group', name: group.name, uid: group.uid }],
            });
          }

          if (change.op === 'remove') {
            if (change.scope.kind === 'project') {
              return deletePolicyBinding.mutateAsync(change.scope.policyBindingName);
            }
            // Org-scope: look up the binding name from membershipName stored on the assignment.
            // Use serverAssignments to avoid matching pending-add entries which have no membershipName.
            const assignment = state.serverAssignments.find((a) => a.id === change.assignmentId);
            const bindingName = assignment?.membershipName;
            if (!bindingName) {
              logger.warn(
                `[group-detail] Cannot resolve binding name for org-scope remove: assignmentId=${change.assignmentId}`
              );
              return Promise.reject(
                new Error(`Cannot resolve binding name for assignment ${change.assignmentId}`)
              );
            }
            return deletePolicyBinding.mutateAsync(bindingName);
          }

          return Promise.resolve();
        })
      );

      const failedChanges = allPendingChanges.filter((_, i) => results[i].status === 'rejected');

      // Build committed state: apply all changes then revert failures — failed adds were never
      // created on the server; failed removes were never deleted so must be added back.
      const failedAddIds = new Set(
        failedChanges
          .filter((c) => c.op === 'add')
          .map(
            (c) =>
              `pending-add-${c.role.name}-${c.scope.kind === 'project' ? `project-${c.scope.projectId}` : 'org'}`
          )
      );
      const failedRemoveIds = new Set(
        failedChanges
          .filter((c): c is PendingRemove => c.op === 'remove')
          .map((c) => c.assignmentId)
      );

      const committedAssignments: UserRoleAssignment[] = [
        ...effectiveAssignments.filter((a) => !failedAddIds.has(a.id)),
        ...state.serverAssignments.filter((a) => failedRemoveIds.has(a.id)),
      ];

      dispatch({ type: 'COMMIT_SUCCESS', payload: { serverAssignments: committedAssignments } });

      if (failedChanges.length > 0) {
        toast.error(
          `${failedChanges.length} of ${allPendingChanges.length} role change${failedChanges.length > 1 ? 's' : ''} failed to save`
        );
      }
    } catch {
      toast.error('Failed to save role changes');
    } finally {
      setIsSaving(false);
    }
  };

  const scopes = [
    { kind: 'org' as const, orgId, orgDisplayName: orgDisplayName ?? orgId },
    ...projects.map((p) => ({
      kind: 'project' as const,
      projectId: p.name,
      projectDisplayName: p.displayName ?? p.name,
    })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6" data-testid="group-roles-editor">
      <GroupHeader group={group} orgId={orgId} />

      {state.addRoleOpen ? (
        <div className="-mx-4 -mb-7 flex flex-1 flex-col overflow-hidden border-t md:-mx-9 md:-mb-9">
          <AddRoleScreen
            roles={roles}
            scopes={scopes}
            existingPermissions={effectivePermissions}
            existingAssignments={effectiveAssignments}
            onAdd={(role, scope) => dispatch({ type: 'STAGE_ADD', payload: { role, scope } })}
            onCancel={() => dispatch({ type: 'CLOSE_ADD_ROLE' })}
          />
        </div>
      ) : (
        <div className="-mx-4 -mb-7 flex flex-1 flex-col overflow-hidden border-t md:-mx-9 md:-mb-9">
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            <div className="flex flex-col overflow-hidden md:w-2/5" data-testid="roles-panel">
              <RolesPanel
                assignments={visibleAssignments}
                pendingChanges={state.pendingChanges}
                canManageRoles={canManageRoles}
                onRemove={(assignment) =>
                  dispatch({
                    type: 'STAGE_REMOVE',
                    payload: {
                      assignmentId: assignment.id,
                      role: assignment.role,
                      scope: assignment.scope,
                    },
                  })
                }
                onAddRole={() => {
                  if (canManageRoles) dispatch({ type: 'OPEN_ADD_ROLE' });
                }}
              />
            </div>
            <section
              aria-label="Effective Permissions"
              className="bg-card flex flex-col overflow-hidden border-t md:w-3/5 md:border-t-0 md:border-l"
              data-testid="permissions-panel">
              <header className="border-b px-6 py-4">
                <h2 className="text-foreground text-[15px] font-semibold">Effective Permissions</h2>
              </header>
              <div className="flex-1 overflow-y-auto">
                <PermissionsPanel
                  permissions={effectivePermissions}
                  losingPermissions={losingPermissions}
                />
              </div>
            </section>
          </div>
          <ActionBar
            pendingCount={pendingCount}
            addCount={addCount}
            removeCount={removeCount}
            isSaving={isSaving}
            onDiscard={() => dispatch({ type: 'DISCARD' })}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
