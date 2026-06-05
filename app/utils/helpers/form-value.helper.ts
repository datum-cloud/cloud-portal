/**
 * Helpers for normalizing field values read from `@datum-cloud/datum-ui/form`.
 *
 * The package's Conform adapter serializes array values as JSON strings when
 * writing to FormData. Its `convertFromString` only parses strings that start
 * with `["` back to arrays, so empty arrays round-trip as the literal string
 * `"[]"` and non-empty arrays round-trip correctly. Consumers that render
 * array-shaped widgets (TagsInput, multi-select, key/value arrays, etc.) must
 * normalize the value before handing it off to the widget; otherwise the
 * widget will crash when calling `.map()` on a string.
 */

/**
 * Coerce a form field value to a `string[]`, un-stringifying JSON-array
 * payloads (including the empty `"[]"` case) produced by Conform's adapter.
 *
 * - Already an array → passed through as `string[]`
 * - JSON-stringified array (e.g. `"[]"`, `'["a","b"]'`) → parsed
 * - Non-empty plain string → wrapped as a single-element array
 * - Anything else (undefined, null, non-string, non-array) → empty array
 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // fall through to single-element coercion
      }
    }
    return value === '' ? [] : [value];
  }
  return [];
}

/**
 * Object-array twin of {@link toStringArray}: coerce a form field value to
 * a `T[]` of objects, un-stringifying JSON-array payloads (e.g. `"[]"` or
 * `'[{"type":"gb_vat","value":"GB123"}]'`) produced by Conform's adapter.
 *
 * Unlike `toStringArray` it does not single-element-wrap plain strings —
 * a bare string is never a valid serialized object array, so anything
 * that isn't already an array or a parseable JSON array becomes `[]`.
 * Keeps downstream `.map()` / `.filter()` calls safe while the user is
 * mid-typing.
 */
export function toObjectArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // Invalid JSON means we have nothing useful to show until the
      // user fixes it — fall through to the empty array.
    }
  }
  return [];
}
