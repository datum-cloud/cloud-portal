import { classifyError } from './classify';
import { env } from '@/utils/env';
import { isUserFacingErrorStatus } from '@/utils/errors/app-error';
import type { Event, EventHint } from '@sentry/react-router';

/**
 * Known system-level actors whose events are suppressed in Sentry.
 * These are internal backend users, not real end users. Their events
 * fire frequently and make it harder to see actual user errors.
 * Add new entries here as additional system actors are identified.
 *
 * - 'system:anonymous': Backend cron job health-check user
 */
const KNOWN_SYSTEM_ACTORS = ['system:anonymous'] as const;

function isFromSystemActor(text: string | undefined): boolean {
  if (!text) return false;
  return KNOWN_SYSTEM_ACTORS.some((actor) => text.includes(actor));
}

/**
 * Returns true if the event originates from a known system actor
 * and should be suppressed in Sentry.
 * Checks exception values and standalone message strings.
 */
export function isKnownSystemEvent(event: Event): boolean {
  const hasSystemException = event.exception?.values?.some(
    (ex) => isFromSystemActor(ex.value) || isFromSystemActor(ex.type)
  );
  if (hasSystemException) return true;

  if (isFromSystemActor(event.message)) return true;

  return false;
}

/**
 * React Router's `getInternalRouterError(405, …)` produces one of two
 * fixed messages when a mutation-method request lands on a route that
 * doesn't define an `action`:
 *
 *   - "You made a {METHOD} request to "{pathname}" but did not provide
 *      an `action` for route "{routeId}", so there is no way to handle
 *      the request."
 *   - "Invalid request method "{METHOD}""
 *
 * In production this is almost exclusively bot/scanner traffic
 * (e.g. `POST //`, `PUT /wp-admin`) — there's no legitimate flow that
 * triggers it. Capturing it to Sentry just buries real errors. The
 * `@sentry/react-router` integration auto-captures these from the SSR
 * boundary, so we filter here as a backstop in addition to the
 * `errorHandler` short-circuit in `app/server/middleware/error-handler.ts`.
 *
 * Scoped tightly to 405 for now — 404s ("No route matches URL …") and
 * 400s ("did not provide a `loader` …") can still indicate real bugs
 * (stale links, missing loaders) so we let those flow through.
 */
const ROUTE_405_PATTERNS: readonly RegExp[] = [
  /^You made a [A-Z]+ request to ".*" but did not provide an `action` for route ".*"/,
  /^Invalid request method "[A-Z]+"/,
];

function matchesRoute405(text: string | undefined): boolean {
  if (!text) return false;
  return ROUTE_405_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Returns true if the event is a React Router 405 "method not allowed"
 * error and should be suppressed in Sentry.
 */
export function isRouteMethodNotAllowedEvent(event: Event): boolean {
  const hasMatch = event.exception?.values?.some((ex) => matchesRoute405(ex.value));
  if (hasMatch) return true;

  if (matchesRoute405(event.message)) return true;

  return false;
}

function leakParts(error: unknown): { signature: string; message: string } {
  if (typeof error !== 'object' || error === null) {
    return { signature: String(error), message: '' };
  }
  const source = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  const status = source.status ?? source.response?.status;
  const name = typeof source.name === 'string' ? source.name : 'Error';
  const message = typeof source.message === 'string' ? source.message : '';
  return { signature: `${name}(status=${String(status)})`, message };
}

// One warning per unique error signature (name + status), so a leaking hot
// path doesn't flood the console; bounded so the set can't grow unchecked.
const warnedLeakSignatures = new Set<string>();
const MAX_WARNED_LEAK_SIGNATURES = 100;

/**
 * Backstop for expected user-state errors (401/403/404/429) that leak past
 * their capture sites. The primary policy lives at the capture sites (axios
 * interceptors, framework error handlers) — this filter should almost never
 * fire. Outside production telemetry it logs a loud warning so the leaking
 * capture site gets fixed, rather than this becoming a second policy layer.
 *
 * `captureApiError` wraps its original error in a synthetic `Error` carrying
 * the upstream status only as a scope tag (`status`), so a leaked 4xx through
 * that path classifies as 'unknown-failure' and would slip past a
 * classification-only check. The event tag is the authoritative signal here.
 */
function isLeakedExpectedError(event: Event, hint: EventHint | undefined): boolean {
  const original = hint?.originalException;

  // `captureApiError` tags the event with `status` on the synthetic wrapper —
  // a 4xx tag means an expected user-state error leaked through that path.
  const statusTag = event.tags?.status;
  const tagIs4xx = typeof statusTag === 'string' && isUserFacingErrorStatus(Number(statusTag));

  if ((original === undefined || original === null) && !tagIs4xx) return false;
  if (classifyError(original) !== 'expected-user-state' && !tagIs4xx) return false;

  const isProductionTelemetry = env.isProd && env.public.sentryEnv === 'production';
  if (!isProductionTelemetry) {
    const { signature, message } = leakParts(original);
    if (!warnedLeakSignatures.has(signature)) {
      if (warnedLeakSignatures.size >= MAX_WARNED_LEAK_SIGNATURES) {
        warnedLeakSignatures.clear();
      }
      warnedLeakSignatures.add(signature);
      console.warn(
        '[sentry-policy] dropped leaked expected error — fix the capture site',
        `${signature} ${message}`.trim()
      );
    }
  }
  return true;
}

/**
 * Master filter for `beforeSend`. Returns true if the event should be
 * dropped (not sent to Sentry). Combines every individual filter so
 * the two `beforeSend` call sites (client + server) stay in sync via
 * a single import.
 *
 * Layer split: this base filter (used by the server in
 * `observability/providers/sentry.ts`) drops system-actor events, bot 405s,
 * and leaked 'expected-user-state' errors. Server-side 'network-failure'
 * (upstream connection errors) stays captured — it is an infra signal.
 */
export function shouldDropSentryEvent(event: Event, hint?: EventHint): boolean {
  if (isKnownSystemEvent(event) || isRouteMethodNotAllowedEvent(event)) return true;
  return isLeakedExpectedError(event, hint);
}

/**
 * Client-side variant used by `app/entry.client.tsx`: everything the base
 * filter drops, plus 'network-failure' — in the browser a failed/timed-out
 * request is user connectivity (flaky wifi, ad-blockers), not a bug.
 */
export function shouldDropSentryEventClient(event: Event, hint?: EventHint): boolean {
  if (shouldDropSentryEvent(event, hint)) return true;
  return classifyError(hint?.originalException) === 'network-failure';
}
