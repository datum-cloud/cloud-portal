import type { TaskMetadata } from '../types';

/**
 * Check if code is running in a browser environment.
 * Used for SSR safety in storage and other browser-dependent code.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function generateTaskId(): string {
  // Use crypto.randomUUID() if available for better uniqueness
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `task_${crypto.randomUUID()}`;
  }
  // Fallback for older environments
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// --- Metadata Factory Functions ---

/**
 * Create metadata for project-scoped tasks.
 * Use this when enqueueing tasks that operate on project resources.
 */
export function createProjectMetadata(
  project: { id: string; name: string },
  org: { id: string; name: string },
  extra?: Record<string, unknown>
): TaskMetadata {
  return {
    scope: 'project',
    projectId: project.id,
    projectName: project.name,
    orgId: org.id,
    orgName: org.name,
    ...extra,
  };
}

/**
 * Create metadata for organization-scoped tasks.
 * Use this when enqueueing tasks that operate on org-level resources.
 */
export function createOrgMetadata(
  org: { id: string; name: string },
  extra?: Record<string, unknown>
): TaskMetadata {
  return {
    scope: 'org',
    orgId: org.id,
    orgName: org.name,
    ...extra,
  };
}

/**
 * Create metadata for user-scoped tasks.
 * Use this when enqueueing tasks that operate on user-level resources.
 */
export function createUserMetadata(extra?: Record<string, unknown>): TaskMetadata {
  return {
    scope: 'user',
    ...extra,
  };
}
