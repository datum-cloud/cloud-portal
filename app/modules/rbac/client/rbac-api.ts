import type { PermissionCheckScope, IPermissionCheck, IPermissionResult } from '../types';

/**
 * Input for a single precise check. Scope/projectId are optional and forwarded
 * to the BFF, which routes the SelfSubjectAccessReview to the correct
 * control-plane base.
 */
export type CheckPermissionInput = IPermissionCheck & {
  scope?: PermissionCheckScope;
  projectId?: string;
};

/** Result of a bulk check item — mirrors the BFF `BulkPermissionResult` shape. */
export interface BulkCheckResult extends IPermissionResult {
  request: {
    resource: string;
    verb: IPermissionCheck['verb'];
    group: string;
    namespace?: string;
    name?: string;
  };
}

/** Single precise check (escape hatch — useAccessReview / usePermission). */
export async function checkPermissionAPI(check: CheckPermissionInput): Promise<IPermissionResult> {
  const response = await fetch('/api/permissions/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
    credentials: 'same-origin',
  });
  const data: { success: boolean; data?: IPermissionResult; error?: string } =
    await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Permission check failed');
  }
  return data.data;
}

/** Batch checks in a single request to avoid client-side N+1 calls. */
export async function checkPermissionsBulkAPI(
  organizationId: string,
  checks: Array<Omit<CheckPermissionInput, 'organizationId'>>
): Promise<BulkCheckResult[]> {
  const response = await fetch('/api/permissions/bulk-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, checks }),
    credentials: 'same-origin',
  });
  const data: { success: boolean; data?: { results: BulkCheckResult[] }; error?: string } =
    await response.json();
  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.error || 'Permission check failed');
  }
  return data.data.results;
}
