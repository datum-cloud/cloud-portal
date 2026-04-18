import { ProfileIdentity } from '@/components/profile-identity';
import type { UserRoleAssignment, PendingRemove } from '@/features/organization/team/roles';
import {
  useRolesEditor,
  RolesPanel,
  PermissionsPanel,
  ActionBar,
  AddRoleScreen,
  resolveAllPermissions,
} from '@/features/organization/team/roles';
import { createRbacMiddleware, RbacService } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { createMemberService } from '@/resources/members';
import type { Member } from '@/resources/members';
import { useUpdateMemberRoles } from '@/resources/members';
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

export const handle = {
  breadcrumb: (loaderData: { member?: Member }) => (
    <span>{loaderData?.member?.user?.email ?? 'Roles'}</span>
  ),
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Member Roles');
});

const _loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId, memberId } = params as { orgId: string; memberId: string };

  const [members, roles, policyBindings, projectsList, canManageRoles] = await Promise.all([
    createMemberService().list(orgId),
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
        resource: 'organizationmemberships',
        verb: 'patch',
        group: 'resourcemanager.miloapis.com',
        namespace: buildOrganizationNamespace(orgId),
      })
      .then((r) => r.allowed && !r.denied)
      .catch(() => false),
  ]);

  const member = members.find((m: Member) => m.name === memberId);
  if (!member) {
    throw data({ message: 'Member not found' }, { status: 404 });
  }

  return data({ member, roles, policyBindings, projects: projectsList.items, canManageRoles });
};

export const loader = withMiddleware(
  _loader,
  createRbacMiddleware({
    resource: 'organizationmemberships',
    verb: 'list',
    group: 'resourcemanager.miloapis.com',
    namespace: (params) => buildOrganizationNamespace(params.orgId),
  })
);

export default function MemberRoles() {
  const { member, roles, policyBindings, projects, canManageRoles } =
    useLoaderData<typeof _loader>();
  const { orgId } = useParams() as { orgId: string };
  const { organization } = useApp();
  const orgDisplayName = organization?.displayName ?? orgId;
  const memberFullName =
    `${member?.user?.givenName ?? ''} ${member?.user?.familyName ?? ''}`.trim() ||
    member?.user?.email ||
    member?.name ||
    'Unknown member';

  const initialAssignments = useMemo<UserRoleAssignment[]>(() => {
    const assignments: UserRoleAssignment[] = [];

    // Org-level assignments from member.roles
    // Hide the self-delete role — it's a system role users should not be able to manage
    const HIDDEN_ROLES = new Set(['organizationmembership-self-delete']);

    for (const memberRole of member?.roles ?? []) {
      if (HIDDEN_ROLES.has(memberRole.name)) continue;
      const resolvedRole = roles.find((r) => r.name === memberRole.name) ?? {
        uid: '',
        name: memberRole.name,
        namespace: memberRole.namespace ?? '',
        resourceVersion: '',
        createdAt: '',
        displayName: memberRole.name,
        includedPermissions: [],
        inheritedRoles: [],
      };
      assignments.push({
        id: `org-${member?.name ?? ''}-${memberRole.name}`,
        role: resolvedRole,
        scope: { kind: 'org', orgId, orgDisplayName: orgDisplayName ?? orgId },
        membershipName: member?.name,
      });
    }

    // Project-level assignments from policy bindings
    // Only include bindings scoped to a Project — org-scoped bindings are already captured via member.roles
    const userId = member?.user?.id;
    if (userId) {
      for (const binding of policyBindings) {
        const isSubject = binding.subjects.some((s) => s.name === userId || s.uid === userId);
        if (!isSubject) continue;

        const refKind = binding.resourceSelector?.resourceRef?.kind;
        if (refKind !== 'Project') continue;

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
      }
    }

    return assignments;
  }, [member, roles, policyBindings, orgId, orgDisplayName]);

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

  const updateMemberRoles = useUpdateMemberRoles(orgId);
  const createPolicyBinding = useCreatePolicyBinding(orgId);
  const deletePolicyBinding = useDeletePolicyBinding(orgId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Org-level changes — must succeed before proceeding
      const orgPendingChanges = state.pendingChanges.filter((c) => c.scope.kind === 'org');
      if (orgPendingChanges.length > 0 && member) {
        const removedRoleNames = new Set(
          orgPendingChanges.filter((c) => c.op === 'remove').map((c) => c.role.name)
        );
        const addedRoles = orgPendingChanges
          .filter((c) => c.op === 'add')
          .map((c) => ({ name: c.role.name, namespace: c.role.namespace ?? '' }));

        // Derive current roles from reducer state rather than the stale loader snapshot so that
        // a second save in the same session reflects what was actually committed by the first save.
        const currentRoles = state.serverAssignments
          .filter((a) => a.scope.kind === 'org')
          .map((a) => ({ name: a.role.name, namespace: a.role.namespace ?? '' }));
        const newRoles = [
          ...currentRoles.filter((r) => !removedRoleNames.has(r.name)),
          ...addedRoles,
        ];

        await updateMemberRoles.mutateAsync({ name: member.name, roles: newRoles });
      }

      // Project-level changes via PolicyBindings — run in parallel, collect failures
      const projectPendingChanges = state.pendingChanges.filter((c) => c.scope.kind === 'project');
      const userId = member?.user?.id;
      // Resolve the user's actual UID from existing policy binding subjects — the memberRef only
      // carries the user's name, not their UID, which the API requires on policy binding subjects.
      const userUid = policyBindings
        .flatMap((b) => b.subjects)
        .find((s) => s.name === userId || s.uid === userId)?.uid;

      const failedProjectChanges: typeof projectPendingChanges = [];

      if (projectPendingChanges.length > 0) {
        const results = await Promise.allSettled(
          projectPendingChanges.map((change) => {
            if (change.scope.kind !== 'project') return Promise.resolve();
            const { projectId } = change.scope;
            if (change.op === 'add' && userId) {
              const project = projects.find((p) => p.name === projectId);
              return createPolicyBinding.mutateAsync({
                resource: {
                  ref: 'resourcemanager.miloapis.com-project',
                  name: projectId,
                  uid: project?.uid,
                },
                role: change.role.name,
                roleNamespace: change.role.namespace,
                subjects: [{ kind: 'User', name: userId, uid: userUid }],
              });
            } else if (change.op === 'remove' && change.scope.policyBindingName) {
              return deletePolicyBinding.mutateAsync(change.scope.policyBindingName);
            }
            return Promise.resolve();
          })
        );

        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            failedProjectChanges.push(projectPendingChanges[i]);
          }
        });
      }

      // Build committed state: start from effectiveAssignments (all changes applied), then
      // revert any failed project changes — failed adds were never created on the server,
      // and failed removes were never deleted, so they must be added back.
      const failedAddIds = new Set(
        failedProjectChanges
          .filter((c) => c.op === 'add')
          .map(
            (c) =>
              `pending-add-${c.role.name}-${c.scope.kind === 'project' ? `project-${c.scope.projectId}` : 'org'}`
          )
      );
      const failedRemoveIds = new Set(
        failedProjectChanges
          .filter((c): c is PendingRemove => c.op === 'remove')
          .map((c) => c.assignmentId)
      );

      const committedAssignments: UserRoleAssignment[] = [
        ...effectiveAssignments.filter((a) => !failedAddIds.has(a.id)),
        ...state.serverAssignments.filter((a) => failedRemoveIds.has(a.id)),
      ];

      dispatch({ type: 'COMMIT_SUCCESS', payload: { serverAssignments: committedAssignments } });

      if (failedProjectChanges.length > 0) {
        toast.error(
          `${failedProjectChanges.length} of ${projectPendingChanges.length} project role change${failedProjectChanges.length > 1 ? 's' : ''} failed to save`
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
    <div className="flex min-h-0 flex-1 flex-col gap-6" data-testid="member-roles-editor">
      <div data-testid="user-header" className="flex items-center gap-5 pb-2">
        <ProfileIdentity
          avatarSrc={member?.user?.avatarUrl}
          name={memberFullName}
          size="lg"
          avatarOnly
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-lg font-semibold">{memberFullName}</h1>
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            {member?.user?.email && <span>{member.user.email}</span>}
            {member?.user?.email && <span className="bg-border inline-block size-1 rounded-full" />}
            <span className="font-medium">User account</span>
            {orgDisplayName && (
              <>
                <span className="bg-border inline-block size-1 rounded-full" />
                <span className="font-medium">{orgDisplayName}</span>
              </>
            )}
          </div>
        </div>
      </div>

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
