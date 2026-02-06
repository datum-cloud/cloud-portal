import type { Task, TaskMetadata } from '../types';
import { useMemo } from 'react';
import { useParams } from 'react-router';

// --- Current Scope Detection ---

export type CurrentScope =
  | { type: 'project'; projectId: string; orgId?: string }
  | { type: 'org'; orgId: string }
  | { type: 'global' };

/**
 * Detect the current scope from URL params.
 * Returns project scope if projectId is present, org scope if only orgId, otherwise global.
 */
export function useCurrentScope(): CurrentScope {
  const params = useParams();

  return useMemo(() => {
    // Project scope takes precedence (projectId implies orgId context)
    if (params.projectId) {
      return {
        type: 'project',
        projectId: params.projectId,
        orgId: params.orgId,
      };
    }

    // Org scope if only orgId is present
    if (params.orgId) {
      return {
        type: 'org',
        orgId: params.orgId,
      };
    }

    // Global scope (account pages, etc.)
    return { type: 'global' };
  }, [params.projectId, params.orgId]);
}

// --- Scope Matching ---

/**
 * Check if task metadata matches the current scope.
 */
export function matchesCurrentScope(
  metadata: TaskMetadata | undefined,
  scope: CurrentScope
): boolean {
  if (!metadata) return false;

  if (scope.type === 'project') {
    return metadata.projectId === scope.projectId;
  }

  if (scope.type === 'org') {
    // Org scope matches if same org AND not a project-scoped task
    return metadata.orgId === scope.orgId && !metadata.projectId;
  }

  // Global scope never matches (all tasks show labels)
  return false;
}

/**
 * Get the context label to display for a task.
 * Returns formatted label with scope type: "Project: Name", "Org: Name", etc.
 */
export function getContextLabel(metadata: TaskMetadata | undefined): string | undefined {
  if (!metadata) return undefined;

  const scope = metadata.scope as string | undefined;

  // Project-scoped task
  if (scope === 'project' && metadata.projectName) {
    return `Project: ${metadata.projectName}`;
  }

  // Org-scoped task
  if (scope === 'org' && metadata.orgName) {
    return `Org: ${metadata.orgName}`;
  }

  // User-scoped task
  if (scope === 'user') {
    return 'User';
  }

  // Fallback: try to infer from available data
  if (metadata.projectName) {
    return `Project: ${metadata.projectName}`;
  }
  if (metadata.orgName) {
    return `Org: ${metadata.orgName}`;
  }

  // Custom scope with no standard name
  if (scope) {
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  }

  return undefined;
}

// --- Tasks with Labels Hook ---

export interface TasksWithLabels {
  tasks: Task[];
  showLabels: boolean;
}

/**
 * Hook that returns tasks with a flag indicating whether to show context labels.
 * Labels are shown when:
 * - User is on a global page (account, etc.)
 * - Tasks are from mixed scopes (not all match current scope)
 */
export function useTasksWithLabels(tasks: Task[]): TasksWithLabels {
  const currentScope = useCurrentScope();

  const showLabels = useMemo(() => {
    // No tasks = no labels needed
    if (tasks.length === 0) return false;

    // Global pages always show labels
    if (currentScope.type === 'global') return true;

    // Check if ALL tasks match current scope
    const allMatchCurrent = tasks.every((task) => matchesCurrentScope(task.metadata, currentScope));

    // Show labels if any task doesn't match
    return !allMatchCurrent;
  }, [tasks, currentScope]);

  return { tasks, showLabels };
}
