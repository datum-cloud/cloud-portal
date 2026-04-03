import type {
  EditorState,
  PendingChange,
  PendingAdd,
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

// Returns all assignments shown in the roles panel — includes pending-removes (shown as struck-through)
function computeVisibleAssignments(
  serverAssignments: UserRoleAssignment[],
  pendingChanges: PendingChange[]
): UserRoleAssignment[] {
  const added: UserRoleAssignment[] = pendingChanges
    .filter((c): c is PendingAdd => c.op === 'add')
    .map((c) => ({
      id: `pending-add-${c.role.name}-${c.scope.kind === 'project' ? `project-${c.scope.projectId}` : 'org'}`,
      role: c.role,
      scope: c.scope,
    }));

  return [...serverAssignments, ...added];
}

// Returns assignments after removes are applied — used for permission calculations
function computeEffectiveAssignments(
  serverAssignments: UserRoleAssignment[],
  pendingChanges: PendingChange[]
): UserRoleAssignment[] {
  const removedIds = new Set(
    pendingChanges.filter((c) => c.op === 'remove').map((c) => c.assignmentId)
  );

  const added: UserRoleAssignment[] = pendingChanges
    .filter((c): c is PendingAdd => c.op === 'add')
    .map((c) => ({
      id: `pending-add-${c.role.name}-${c.scope.kind === 'project' ? `project-${c.scope.projectId}` : 'org'}`,
      role: c.role,
      scope: c.scope,
    }));

  return [...serverAssignments.filter((a) => !removedIds.has(a.id)), ...added];
}

function reducer(state: EditorState, action: Action): EditorState {
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
  const [state, dispatch] = useReducer(reducer, {
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
