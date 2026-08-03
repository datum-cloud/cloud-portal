import { logger } from '@/modules/logger';

/** Client-side signal only (Sentry breadcrumb / dev console). The server-side
 *  counter for REAL quota rejections lives in the BFF proxy (quota_denied_total). */
export function recordQuotaGateDenied(d: {
  resourceType: string;
  allocated?: number;
  limit?: number;
  scope: string;
}): void {
  logger.warn('[Quota] gate denied', d);
}
