import type { PermissionCheckScope } from '../types';

/**
 * True when a check batch contains a project-scoped check but no projectId has
 * resolved yet.
 *
 * RbacContext receives org/project identifiers asynchronously: AppProvider
 * populates them from layout effects after first commit (see
 * app/layouts/private.layout.tsx, RbacAppWrapper). On first project-page load
 * and on org→project navigations there is a window where organizationId is
 * already set while projectId is still undefined. A project-scoped
 * SelfSubjectAccessReview fired in that window is guaranteed to violate the
 * server-side `projectId` invariant (RbacService.resolveBaseURL), so callers
 * must keep the query disabled — fail-closed, still loading — until the
 * project context resolves.
 */
export function hasUnresolvedProjectScope(
  checks: ReadonlyArray<{ scope?: PermissionCheckScope }>,
  projectId: string | undefined
): boolean {
  return !projectId && checks.some((check) => check.scope === 'project');
}
