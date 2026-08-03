import { QUOTA_DENIED_ANCHORS } from '@/modules/quota/quota-error';
import { Counter, register } from 'prom-client';

const QUOTA_DENIED_TOTAL = 'quota_denied_total';

/**
 * Returns `quota_denied_total` labels when the body is a quota-denied K8s Status,
 * null otherwise. Extracted from the proxy route so anchor matching and label
 * extraction are unit-testable — anchor drift would otherwise zero the metric silently.
 */
export function extractQuotaDenialLabels(body: string): { group: string; resource: string } | null {
  if (!QUOTA_DENIED_ANCHORS.some((anchor) => body.includes(anchor))) return null;
  try {
    const status = JSON.parse(body) as { details?: { group?: string; kind?: string } };
    return {
      group: status.details?.group ?? 'unknown',
      // `details.kind` carries the PLURAL resource — a NewForbidden quirk.
      resource: status.details?.kind ?? 'unknown',
    };
  } catch {
    return { group: 'unknown', resource: 'unknown' };
  }
}

export const quotaDeniedTotal =
  (register.getSingleMetric(QUOTA_DENIED_TOTAL) as Counter<'group' | 'resource'> | undefined) ??
  new Counter({
    name: QUOTA_DENIED_TOTAL,
    help: 'Count of quota-denied 403 responses proxied to the client',
    labelNames: ['group', 'resource'] as const,
  });
