/**
 * Pure decision logic for the quota-readiness guard in `ensureSharedResources`.
 *
 * A freshly created project has no quota until Milo's grant-creation
 * controller writes its ResourceGrants and the AllowanceBuckets materialise.
 * When staging's grant queue is backed up (see the issue below) that can take
 * minutes, and every resource create in the regression suite is then denied
 * with "Insufficient quota resources". Polling for the httpproxies bucket
 * before returning the shared project turns three unrelated assertion
 * failures into one clear "quota never provisioned" error.
 *
 * This module has no Cypress imports so it can be unit-tested with `bun test`;
 * the `cy.request` + retry orchestration lives in `e2e.ts`.
 */

/** How often to re-list allowance buckets while waiting for quota. */
export const QUOTA_POLL_INTERVAL_MS = 5_000;

/** Total time to wait for the project's quota grants to materialise. */
export const QUOTA_READY_TIMEOUT_MS = 90_000;

/** The bucket whose presence proves the project's default grants landed. */
export const NETWORKING_HTTPPROXIES_RESOURCE_TYPE = 'networking.datumapis.com/httpproxies';

export const QUOTA_ISSUE_URL = 'https://github.com/datum-cloud/cloud-portal/issues/1553';

const ALLOWANCE_BUCKETS_PAGE_SIZE = 500;

/** Outcome of a single poll of the allowance bucket list. */
export type QuotaPollOutcome =
  /** 2xx and the httpproxies bucket is present. */
  | 'ready'
  /** 2xx but the bucket has not materialised yet. */
  | 'not-provisioned'
  /** 401/403: RBAC for the new project can lag; keep retrying. */
  | 'auth-pending'
  /** Any other non-2xx; retried within the window, reported on timeout. */
  | 'request-failed';

/** Portal proxy URL for the project control-plane allowance bucket list. */
export function allowanceBucketsUrl(projectId: string): string {
  return (
    `/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}` +
    `/control-plane/apis/quota.miloapis.com/v1alpha1/namespaces/milo-system/allowancebuckets` +
    `?limit=${ALLOWANCE_BUCKETS_PAGE_SIZE}`
  );
}

/**
 * True when the raw AllowanceBucketList body contains a bucket whose
 * `spec.resourceType` is the networking httpproxies type.
 * Tolerates malformed bodies (HTML login pages, missing `items`, etc.).
 */
export function hasNetworkingBucket(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;

  const { items } = body as { items?: unknown };
  if (!Array.isArray(items)) return false;

  return items.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const { spec } = item as { spec?: unknown };
    if (!spec || typeof spec !== 'object') return false;
    return (
      (spec as { resourceType?: unknown }).resourceType === NETWORKING_HTTPPROXIES_RESOURCE_TYPE
    );
  });
}

export function classifyQuotaPoll(status: number, body: unknown): QuotaPollOutcome {
  if (status >= 200 && status < 300) {
    return hasNetworkingBucket(body) ? 'ready' : 'not-provisioned';
  }
  if (status === 401 || status === 403) return 'auth-pending';
  return 'request-failed';
}

/**
 * Error message for a poll that exhausted the timeout window.
 * `lastStatus` is only surfaced when the list request itself kept failing.
 */
export function buildQuotaTimeoutMessage(
  projectId: string,
  lastOutcome: Exclude<QuotaPollOutcome, 'ready'>,
  lastStatus: number
): string {
  const seconds = Math.round(QUOTA_READY_TIMEOUT_MS / 1_000);

  if (lastOutcome === 'request-failed') {
    return (
      `ensureSharedResources: allowance bucket list for project ${projectId} ` +
      `still returned HTTP ${lastStatus} after ${seconds}s; see ${QUOTA_ISSUE_URL}`
    );
  }

  return (
    `ensureSharedResources: quota never provisioned for project ${projectId} after ${seconds}s ` +
    `(no ${NETWORKING_HTTPPROXIES_RESOURCE_TYPE} allowance bucket). ` +
    `Staging grant provisioning is stalled; see ${QUOTA_ISSUE_URL}`
  );
}
