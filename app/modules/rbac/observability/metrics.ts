// app/modules/rbac/observability/metrics.ts
import { logger } from '@/modules/logger';
import { Counter, register } from 'prom-client';

const PERMISSION_DENIED_TOTAL = 'rbac_permission_denied_total';

// Reuse the already-registered metric if present. Module-level metric
// construction throws "already registered" when the dev server hot-reloads
// this module against prom-client's default registry; get-or-create makes
// re-evaluation idempotent.
export const permissionDeniedTotal =
  (register.getSingleMetric(PERMISSION_DENIED_TOTAL) as Counter<'resource' | 'verb'> | undefined) ??
  new Counter({
    name: PERMISSION_DENIED_TOTAL,
    help: 'Count of permission denials at enforcement points',
    labelNames: ['resource', 'verb'] as const,
  });

export function recordDenial(resource: string, verb: string): void {
  permissionDeniedTotal.inc({ resource, verb });
  logger.warn('[RBAC] permission denied', { resource, verb });
}
