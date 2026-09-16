import {
  QUOTA_POLL_INTERVAL_MS,
  QUOTA_READY_TIMEOUT_MS,
  allowanceBucketsUrl,
  buildQuotaTimeoutMessage,
  classifyQuotaPoll,
} from './quota-readiness';

/**
 * Poll the project's allowance bucket list via `cy.request` until the
 * `networking.datumapis.com/httpproxies` bucket exists, proving Milo's default
 * quota grants have materialised for the new project. Polls every
 * `QUOTA_POLL_INTERVAL_MS` until `QUOTA_READY_TIMEOUT_MS` has elapsed, so the
 * last poll lands at the deadline rather than one interval before it. 401/403
 * are retried within the same window because RBAC for a fresh project can lag
 * behind its creation.
 *
 * Decision logic lives in `./quota-readiness` so it can be unit-tested; this
 * file only holds the Cypress orchestration.
 */
export function waitForProjectQuota(projectId: string, startedAt: number, attempt = 1): void {
  cy.request({
    url: allowanceBucketsUrl(projectId),
    failOnStatusCode: false,
    log: false,
  }).then((response) => {
    const outcome = classifyQuotaPoll(response.status, response.body);
    const elapsedMs = Date.now() - startedAt;
    cy.log(
      `ensureSharedResources: quota poll #${attempt} for ${projectId} → ${outcome} ` +
        `(HTTP ${response.status}, ${Math.round(elapsedMs / 1_000)}s elapsed)`
    );

    if (outcome === 'ready') return;

    if (elapsedMs >= QUOTA_READY_TIMEOUT_MS) {
      throw new Error(buildQuotaTimeoutMessage(projectId, outcome, response.status));
    }

    cy.wait(QUOTA_POLL_INTERVAL_MS, { log: false });
    waitForProjectQuota(projectId, startedAt, attempt + 1);
  });
}
