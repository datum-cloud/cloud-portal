/**
 * Stable issue grouping for framework-level captures.
 *
 * Sentry groups these events by "exception stacktrace — all frames", so one
 * fault reached from several callers splits into one issue per caller: the
 * `projectId is required` invariant produced 22 issues (one per route) and
 * `"/" cannot be parsed as a URL` produced 10. An explicit fingerprint
 * collapses them, while the route stays a searchable tag on the event.
 */
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const EMAIL = /\b[^\s"@]+@[^\s"@]+\.[^\s"@]+\b/g;
const QUOTED_VALUE = /"[^"]*"/g;

/**
 * Replace volatile identifiers so the same fault groups regardless of which
 * resource triggered it. Deliberately narrow — only quoted values, emails and
 * UUIDs are redacted. Unquoted identifiers are left alone: over-normalizing
 * would merge genuinely different faults, which is the failure mode this is
 * most exposed to.
 */
export function normalizeMessage(message: string): string {
  return message
    .replace(UUID, '<uuid>')
    .replace(EMAIL, '<email>')
    .replace(QUOTED_VALUE, '"<redacted>"');
}

/**
 * Build a grouping key for an error of unknown shape. `code` wins when present
 * so typed errors stay distinct; otherwise the normalized message is used.
 */
export function buildErrorFingerprint(error: unknown): string[] {
  const source = error as { name?: unknown; code?: unknown; message?: unknown } | null;
  const name = typeof source?.name === 'string' && source.name ? source.name : 'Error';
  const code = typeof source?.code === 'string' && source.code ? source.code : undefined;
  const message =
    typeof source?.message === 'string' && source.message ? normalizeMessage(source.message) : '';

  return [name, code ?? message].map((part) => part || '<no-message>');
}
