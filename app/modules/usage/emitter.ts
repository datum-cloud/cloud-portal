// app/modules/usage/emitter.ts
//
// Thin HTTP client that POSTs usage events to the durable Ingestion
// Gateway. Until the gateway exists in the deployment env (i.e.
// USAGE_GATEWAY_URL is unset), `emitUsageEvents` is a no-op; this lets
// the rest of the codebase wire emission unconditionally without
// breaking dev/staging.
//
// The contract intentionally mirrors the v0 batch endpoint shape:
//   POST <gateway>/v1alpha1/events  { events: UsageEvent[] }
//
// On any error we log and resolve — never throw — so usage emission can
// never fail a user's chat request. Drops are surfaced via the usage
// metric counter and the structured log (operators page on
// `usage.emit.failed` rather than user-facing 5xx).
import type { UsageEvent } from './types';
import { logger } from '@/modules/logger';
import { env } from '@/utils/env/env.server';

const EMIT_TIMEOUT_MS = 5_000;

export interface EmitResult {
  /** True when the gateway accepted the batch (2xx) OR was disabled. */
  ok: boolean;
  /** True when no gateway is configured — events were intentionally dropped. */
  noop: boolean;
  /** Number of events submitted (0 when noop or empty). */
  count: number;
  /** HTTP status if a request was made. */
  status?: number;
  /** Error message when ok=false. */
  error?: string;
}

export async function emitUsageEvents(events: UsageEvent[]): Promise<EmitResult> {
  if (events.length === 0) {
    return { ok: true, noop: false, count: 0 };
  }

  const gateway = env.server.usageGatewayUrl;
  if (!gateway) {
    logger.debug('usage.emit.noop', {
      reason: 'USAGE_GATEWAY_URL not configured',
      eventCount: events.length,
      meterNames: [...new Set(events.map((e) => e.meterName))],
    });
    return { ok: true, noop: true, count: events.length };
  }

  const url = new URL('/v1alpha1/events', gateway).toString();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.server.usageGatewayToken) {
    headers.authorization = `Bearer ${env.server.usageGatewayToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMIT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn('usage.emit.failed', {
        status: res.status,
        eventCount: events.length,
        eventIDs: events.map((e) => e.eventID),
        meterNames: [...new Set(events.map((e) => e.meterName))],
        body: body.slice(0, 512),
      });
      return { ok: false, noop: false, count: events.length, status: res.status, error: body };
    }

    logger.info('usage.emit.ok', {
      status: res.status,
      eventCount: events.length,
      meterNames: [...new Set(events.map((e) => e.meterName))],
    });
    return { ok: true, noop: false, count: events.length, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('usage.emit.failed', {
      eventCount: events.length,
      eventIDs: events.map((e) => e.eventID),
      meterNames: [...new Set(events.map((e) => e.meterName))],
      error: message,
    });
    return { ok: false, noop: false, count: events.length, error: message };
  } finally {
    clearTimeout(timer);
  }
}
