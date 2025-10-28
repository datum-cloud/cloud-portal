/**
 * Client-side API functions for RBAC
 * Uses fetch with relative URLs (browser only)
 */
import type { IPermissionCheck, IPermissionResult, IBulkPermissionResult } from '../types';

interface PermissionCheckResponse {
  success: boolean;
  data?: IPermissionResult;
  error?: string;
}

interface BulkPermissionCheckResponse {
  success: boolean;
  data?: {
    results: IBulkPermissionResult[];
  };
  error?: string;
}

/**
 * Check single permission (client-side only)
 *
 * @param check - Permission check parameters
 * @returns Permission result
 *
 * @example
 * ```typescript
 * const result = await checkPermissionAPI({
 *   organizationId: 'org-123',
 *   resource: 'workloads',
 *   verb: 'create',
 *   namespace: 'default',
 * });
 * ```
 */
export async function checkPermissionAPI(check: IPermissionCheck): Promise<IPermissionResult> {
  const response = await fetch('/api/permissions/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
    credentials: 'same-origin', // Include auth cookies
  });

  const data: PermissionCheckResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Permission check failed');
  }

  if (!data.data) {
    throw new Error('No data returned from permission check');
  }

  return data.data;
}

/**
 * Check multiple permissions (client-side only)
 *
 * @param organizationId - Organization ID
 * @param checks - Array of permission checks
 * @returns Array of permission results
 *
 * @example
 * ```typescript
 * const results = await checkPermissionsBulkAPI('org-123', [
 *   { resource: 'workloads', verb: 'create' },
 *   { resource: 'secrets', verb: 'list' },
 * ]);
 * ```
 */
export async function checkPermissionsBulkAPI(
  organizationId: string,
  checks: Array<Omit<IPermissionCheck, 'organizationId'>>
): Promise<IBulkPermissionResult[]> {
  const normalizedChecks = checks.map((check) => ({
    ...check,
    group: check.group || '',
  }));

  const response = await fetch('/api/permissions/bulk-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId,
      checks: normalizedChecks,
    }),
    credentials: 'same-origin', // Include auth cookies
  });

  const data: BulkPermissionCheckResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Bulk permission check failed');
  }

  if (!data.data) {
    throw new Error('No data returned from bulk permission check');
  }

  return data.data.results;
}
