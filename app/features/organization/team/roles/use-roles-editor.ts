import type {
  EditorState,
  PendingChange,
  PendingAdd,
  PendingRemove,
  UserRoleAssignment,
} from './roles-editor.types';
import { useReducer, useMemo } from 'react';

type Action =
  | { type: 'STAGE_ADD'; payload: { role: PendingAdd['role']; scope: PendingAdd['scope'] } }
  | {
      type: 'STAGE_REMOVE';
      payload: { assignmentId: string; role: PendingAdd['role']; scope: PendingAdd['scope'] };
    }
  | { type: 'SELECT_ASSIGNMENT'; payload: { id: string | null } }
  | { type: 'OPEN_ADD_ROLE' }
  | { type: 'CLOSE_ADD_ROLE' }
  | { type: 'SET_ADD_ROLE_SCOPE'; payload: { scope: 'org' | string } }
  | { type: 'DISCARD' }
  | { type: 'COMMIT_SUCCESS'; payload: { serverAssignments: UserRoleAssignment[] } };

/**
 * The id a staged add carries in editor state, and still carries after a save
 * commits it. Rollback finds failed adds by this id, so build it only here.
 *
 * Parts are joined with `:`, which Kubernetes names cannot contain, so a
 * hyphenated role or project name can never produce another add's id.
 */
export function pendingAddId(change: Pick<PendingAdd, 'role' | 'scope'>): string {
  const scopePart = change.scope.kind === 'project' ? `project:${change.scope.projectId}` : 'org';
  return `pending-add:${change.role.name}:${scopePart}`;
}

function toPendingAssignments(pendingChanges: PendingChange[]): UserRoleAssignment[] {
  return pendingChanges
    .filter((c): c is PendingAdd => c.op === 'add')
    .map((c) => ({ id: pendingAddId(c), role: c.role, scope: c.scope }));
}

/**
 * Every assignment shown in the roles panel: server assignments, including
 * pending removes (rendered struck through), followed by staged adds.
 */
export function computeVisibleAssignments(
  serverAssignments: UserRoleAssignment[],
  pendingChanges: PendingChange[]
): UserRoleAssignment[] {
  return [...serverAssignments, ...toPendingAssignments(pendingChanges)];
}

/**
 * The assignments as they would be if every pending change were saved:
 * pending removes dropped, staged adds included. Drives permission previews.
 */
export function computeEffectiveAssignments(
  serverAssignments: UserRoleAssignment[],
  pendingChanges: PendingChange[]
): UserRoleAssignment[] {
  const removedIds = new Set(
    pendingChanges.filter((c) => c.op === 'remove').map((c) => c.assignmentId)
  );

  return [
    ...serverAssignments.filter((a) => !removedIds.has(a.id)),
    ...toPendingAssignments(pendingChanges),
  ];
}

/**
 * The assignments to commit after a save where some changes may have failed.
 * Successful changes are applied and failures reverted: a failed add was never
 * created, so it is dropped; a failed remove was never deleted, so it stays,
 * in its original position.
 */
export function commitAssignments(
  serverAssignments: UserRoleAssignment[],
  pendingChanges: PendingChange[],
  failedChanges: PendingChange[]
): UserRoleAssignment[] {
  const failedAddIds = new Set(
    failedChanges.filter((c): c is PendingAdd => c.op === 'add').map(pendingAddId)
  );
  const failedRemoveIds = new Set(
    failedChanges.filter((c): c is PendingRemove => c.op === 'remove').map((c) => c.assignmentId)
  );
  const removedIds = new Set(
    pendingChanges
      .filter((c): c is PendingRemove => c.op === 'remove' && !failedRemoveIds.has(c.assignmentId))
      .map((c) => c.assignmentId)
  );

  return [
    ...serverAssignments.filter((a) => !removedIds.has(a.id)),
    ...toPendingAssignments(pendingChanges).filter((a) => !failedAddIds.has(a.id)),
  ];
}

/** Reducer behind {@link useRolesEditor}; exported so it can be tested without React. */
export function rolesEditorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'STAGE_ADD': {
      const { role, scope } = action.payload;
      const alreadyExists =
        state.serverAssignments.some(
          (a) =>
            a.role.name === role.name &&
            a.scope.kind === scope.kind &&
            (scope.kind === 'org' ||
              (a.scope.kind === 'project' && a.scope.projectId === scope.projectId))
        ) ||
        state.pendingChanges.some(
          (c) =>
            c.op === 'add' &&
            c.role.name === role.name &&
            c.scope.kind === scope.kind &&
            (scope.kind === 'org' ||
              (c.scope.kind === 'project' && c.scope.projectId === scope.projectId))
        );
      if (alreadyExists) return { ...state, addRoleOpen: false };
      return {
        ...state,
        pendingChanges: [...state.pendingChanges, { op: 'add', role, scope }],
        addRoleOpen: false,
      };
    }
    case 'STAGE_REMOVE': {
      const alreadyPending = state.pendingChanges.some(
        (c) => c.op === 'remove' && c.assignmentId === action.payload.assignmentId
      );
      if (alreadyPending) {
        return {
          ...state,
          pendingChanges: state.pendingChanges.filter(
            (c) => !(c.op === 'remove' && c.assignmentId === action.payload.assignmentId)
          ),
        };
      }
      return {
        ...state,
        pendingChanges: [
          ...state.pendingChanges,
          {
            op: 'remove',
            assignmentId: action.payload.assignmentId,
            role: action.payload.role,
            scope: action.payload.scope,
          },
        ],
      };
    }
    case 'SELECT_ASSIGNMENT':
      return { ...state, selectedAssignmentId: action.payload.id };
    case 'OPEN_ADD_ROLE':
      return { ...state, addRoleOpen: true };
    case 'CLOSE_ADD_ROLE':
      return { ...state, addRoleOpen: false };
    case 'SET_ADD_ROLE_SCOPE':
      return { ...state, addRoleScopeFilter: action.payload.scope };
    case 'DISCARD':
      return { ...state, pendingChanges: [] };
    case 'COMMIT_SUCCESS':
      return {
        ...state,
        serverAssignments: action.payload.serverAssignments,
        pendingChanges: [],
        addRoleOpen: false,
      };
    default:
      return state;
  }
}

export function useRolesEditor(initialAssignments: UserRoleAssignment[]) {
  const [state, dispatch] = useReducer(rolesEditorReducer, {
    serverAssignments: initialAssignments,
    pendingChanges: [],
    selectedAssignmentId: null,
    addRoleOpen: false,
    addRoleScopeFilter: 'org',
  });

  // All assignments visible in the roles panel (includes pending-remove, excludes nothing)
  const visibleAssignments = useMemo(
    () => computeVisibleAssignments(state.serverAssignments, state.pendingChanges),
    [state.serverAssignments, state.pendingChanges]
  );

  // Assignments after removes are applied — used for permission calculations
  const effectiveAssignments = useMemo(
    () => computeEffectiveAssignments(state.serverAssignments, state.pendingChanges),
    [state.serverAssignments, state.pendingChanges]
  );

  const addCount = state.pendingChanges.filter((c) => c.op === 'add').length;
  const removeCount = state.pendingChanges.filter((c) => c.op === 'remove').length;
  const pendingCount = state.pendingChanges.length;

  return {
    state,
    dispatch,
    visibleAssignments,
    effectiveAssignments,
    addCount,
    removeCount,
    pendingCount,
  };
}
