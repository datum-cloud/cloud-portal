import type { EditorState, RoleScope, UserRoleAssignment } from './roles-editor.types';
import {
  commitAssignments,
  computeEffectiveAssignments,
  computeVisibleAssignments,
  pendingAddId,
  rolesEditorReducer,
} from './use-roles-editor';
import type { Role } from '@/resources/roles';
import { describe, expect, it } from 'bun:test';

const role = (name: string): Role => ({ name, namespace: 'datum-cloud' }) as Role;

const ORG: RoleScope = { kind: 'org', orgId: 'org-1', orgDisplayName: 'Org 1' };
const projectScope = (projectId: string): RoleScope => ({
  kind: 'project',
  projectId,
  projectDisplayName: projectId,
  policyBindingName: `pb-${projectId}`,
});

const viewerOrg: UserRoleAssignment = { id: 'srv-viewer', role: role('viewer'), scope: ORG };
const editorAlpha: UserRoleAssignment = {
  id: 'srv-editor-alpha',
  role: role('editor'),
  scope: projectScope('alpha'),
};

const initialState = (serverAssignments: UserRoleAssignment[]): EditorState => ({
  serverAssignments,
  pendingChanges: [],
  selectedAssignmentId: null,
  addRoleOpen: false,
  addRoleScopeFilter: 'org',
});

const stageAdd = (state: EditorState, name: string, scope: RoleScope) =>
  rolesEditorReducer(state, { type: 'STAGE_ADD', payload: { role: role(name), scope } });

const stageRemove = (state: EditorState, a: UserRoleAssignment) =>
  rolesEditorReducer(state, {
    type: 'STAGE_REMOVE',
    payload: { assignmentId: a.id, role: a.role, scope: a.scope },
  });

const byId = (a: UserRoleAssignment, b: UserRoleAssignment) => a.id.localeCompare(b.id);

describe('pendingAddId', () => {
  it('keys org adds by role name', () => {
    expect(pendingAddId({ role: role('admin'), scope: ORG })).toBe('pending-add:admin:org');
  });

  it('keys project adds by role name and project id', () => {
    expect(pendingAddId({ role: role('admin'), scope: projectScope('alpha') })).toBe(
      'pending-add:admin:project:alpha'
    );
  });

  it('does not collide when a role name contains a hyphenated scope word', () => {
    // With "-" as the separator both of these were "pending-add-x-project-org".
    const orgAdd = pendingAddId({ role: role('x-project'), scope: ORG });
    const projectAdd = pendingAddId({ role: role('x'), scope: projectScope('org') });
    expect(orgAdd).not.toBe(projectAdd);
  });

  it('is the id the editor gives staged adds', () => {
    const state = stageAdd(initialState([]), 'admin', projectScope('beta'));
    const [visible] = computeVisibleAssignments(state.serverAssignments, state.pendingChanges);
    const [effective] = computeEffectiveAssignments(state.serverAssignments, state.pendingChanges);
    const [change] = state.pendingChanges;
    if (change.op !== 'add') throw new Error('expected a staged add');

    expect(visible.id).toBe(pendingAddId(change));
    expect(effective.id).toBe(visible.id);
  });
});

describe('commitAssignments ordering', () => {
  it('restores a failed remove in its original position', () => {
    const staged = stageRemove(initialState([viewerOrg, editorAlpha]), viewerOrg);
    const committed = commitAssignments(
      staged.serverAssignments,
      staged.pendingChanges,
      staged.pendingChanges
    );
    expect(committed).toEqual([viewerOrg, editorAlpha]);
  });
});

describe('commitAssignments after a partial save', () => {
  // Stage: add admin@org (succeeds), add editor@beta (fails),
  //        remove viewer@org (succeeds), remove editor@alpha (fails).
  const staged = [
    (s: EditorState) => stageAdd(s, 'admin', ORG),
    (s: EditorState) => stageAdd(s, 'editor', projectScope('beta')),
    (s: EditorState) => stageRemove(s, viewerOrg),
    (s: EditorState) => stageRemove(s, editorAlpha),
  ].reduce((state, step) => step(state), initialState([viewerOrg, editorAlpha]));

  const failed = staged.pendingChanges.filter(
    (c) =>
      (c.op === 'add' && c.scope.kind === 'project') ||
      (c.op === 'remove' && c.assignmentId === editorAlpha.id)
  );

  const committed = commitAssignments(staged.serverAssignments, staged.pendingChanges, failed);
  const after = rolesEditorReducer(staged, {
    type: 'COMMIT_SUCCESS',
    payload: { serverAssignments: committed },
  });

  it('keeps successful changes and reverts failed ones', () => {
    const summary = after.serverAssignments.map(
      (a) => `${a.role.name}@${a.scope.kind === 'org' ? 'org' : a.scope.projectId}`
    );
    expect(summary.sort()).toEqual(['admin@org', 'editor@alpha']);
  });

  it('restores the failed remove with its original server id', () => {
    expect(after.serverAssignments).toContainEqual(editorAlpha);
  });

  it('drops the failed add entirely', () => {
    const failedAddId = pendingAddId({ role: role('editor'), scope: projectScope('beta') });
    expect(after.serverAssignments.some((a) => a.id === failedAddId)).toBe(false);
  });

  it('clears pending changes so nothing is double-counted', () => {
    expect(after.pendingChanges).toEqual([]);
    expect(computeVisibleAssignments(after.serverAssignments, after.pendingChanges)).toEqual(
      after.serverAssignments
    );
    expect(computeEffectiveAssignments(after.serverAssignments, after.pendingChanges)).toEqual(
      after.serverAssignments
    );
  });

  it('lets the user retry the failed add', () => {
    const retried = stageAdd(after, 'editor', projectScope('beta'));
    expect(retried.pendingChanges).toHaveLength(1);
    expect(retried.pendingChanges[0]).toMatchObject({ op: 'add', role: { name: 'editor' } });
  });

  it('treats the successful add as committed, so restaging it is a no-op', () => {
    expect(stageAdd(after, 'admin', ORG).pendingChanges).toEqual([]);
  });

  it('commits every change when nothing failed', () => {
    const all = commitAssignments(staged.serverAssignments, staged.pendingChanges, []);
    expect(all.map((a) => a.id).sort()).toEqual(
      [
        pendingAddId({ role: role('admin'), scope: ORG }),
        pendingAddId({ role: role('editor'), scope: projectScope('beta') }),
      ].sort()
    );
  });

  it('leaves server state untouched when every change failed', () => {
    const none = commitAssignments(
      staged.serverAssignments,
      staged.pendingChanges,
      staged.pendingChanges
    );
    expect([...none].sort(byId)).toEqual([viewerOrg, editorAlpha].sort(byId));
  });
});
