import type { AllowanceBucketStatus } from '@/resources/allowance-buckets';

export interface QuotaIncreaseContext {
  scope: 'organization' | 'project';
  name?: string;
  displayName?: string;
}

export function buildQuotaIncreaseRequest(resourceType: string, ctx: QuotaIncreaseContext) {
  const label = ctx.scope === 'organization' ? 'Organization' : 'Project';
  const who = `${ctx.displayName ?? ctx.name ?? 'unknown'} (${ctx.name ?? 'unknown'})`;
  return {
    subject: `Quota increase request: ${resourceType}`,
    text:
      `Hello team,\n\n` +
      `I'd like to request an increase for the "${resourceType}" quota.\n\n` +
      `Details:\n- ${label}: ${who}\n` +
      `- Requested new limit: [please specify]\n` +
      `- Reason/justification: [brief context, e.g., upcoming workload/traffic]\n\n` +
      `Thank you!`,
  };
}

/** Exhausted = a status exists and has no headroom. Missing status is NOT exhausted (fail-open). */
export function isBucketExhausted(status: AllowanceBucketStatus | undefined): boolean {
  return !!status && status.available <= 0;
}
