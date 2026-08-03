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

let initialized = false;

/**
 * Ensures the RBAC prom-client metrics are registered. Called explicitly
 * from the server entry (rather than relying on a bare side-effect import)
 * so `"sideEffects": false` tree-shaking can't drop the registration from
 * the production server bundle — see app/server/entry.ts.
 *
 * The counter is actually created eagerly above via the get-or-create
 * pattern, so this is a no-op guard that just gives entry.ts a named,
 * value-importable symbol to call — matching the explicit-init convention
 * used by configureServerClient / ensureFeatureFlagProvider.
 */
export function ensureRbacMetrics(): void {
  if (initialized) return;
  initialized = true;
  void permissionDeniedTotal;
}
