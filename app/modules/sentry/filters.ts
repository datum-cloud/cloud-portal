import type { Event } from '@sentry/react-router';

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

/**
 * Master filter for `beforeSend`. Returns true if the event should be
 * dropped (not sent to Sentry). Combines every individual filter so
 * the two `beforeSend` call sites (client + server) stay in sync via
 * a single import.
 */
export function shouldDropSentryEvent(event: Event): boolean {
  return isKnownSystemEvent(event) || isRouteMethodNotAllowedEvent(event);
}
