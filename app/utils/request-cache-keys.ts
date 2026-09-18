/**
 * Keys for `oncePerRequest` (app/modules/axios/request-context.ts).
 *
 * Two callers only share an upstream read if they pass the identical key, so
 * these live in one import-free module rather than as string literals at each
 * call site. A key must identify the *call*, arguments included — sharing a key
 * between reads that differ in any argument serves one caller the other's data.
 */
export const requestCacheKeys = {
  /** `getUserWithAccessRetry(userId, …)` — the fraud/onboarding user load. */
  userAccess: (userId: string) => `user-access:${userId}`,
  /** `organizations.list({ limit: 1 })` — the "does this user have any org?" probe. */
  anyOrganizations: 'organizations:any',
  /** `projects.get(projectId)`. */
  project: (projectId: string) => `project:${projectId}`,
  /** `organizations.get(orgId)`. */
  organization: (orgId: string) => `organization:${orgId}`,
} as const;
