/**
 * Shape checks for route params the BFF puts into upstream URLs.
 *
 * Hono hands route params over percent-decoded, so `%2e%2e` arrives as `..`
 * and `a%2Fb` as `a/b`. Interpolating one into an upstream URL lets a caller
 * walk the upstream path or smuggle query parameters. Each param must match
 * the shape the upstream API gives it, checked before any URL is built.
 */

const DNS1123_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const DNS1123_LABEL_MAX_LENGTH = 63;
const LOWERCASE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A Kubernetes name in its strictest form, an RFC 1123 label: projects, namespaces. */
export function isDns1123Label(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= DNS1123_LABEL_MAX_LENGTH &&
    DNS1123_LABEL.test(value)
  );
}

/** A UUID in canonical lowercase 8-4-4-4-12 hex form. */
export function isLowercaseUuid(value: unknown): value is string {
  return typeof value === 'string' && LOWERCASE_UUID.test(value);
}

/** Joins path segments, encoding each one, so no segment can add a `/`, `?` or `#`. */
export function encodePathSegments(...segments: string[]): string {
  return segments.map((segment) => `/${encodeURIComponent(segment)}`).join('');
}
