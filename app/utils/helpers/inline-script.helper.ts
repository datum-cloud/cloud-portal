const UNSAFE_INLINE_SCRIPT_CHARS: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * JSON for a `<script>` body. `JSON.stringify` leaves `</script>` intact, which
 * ends the element early and lets whatever follows run as markup. Escaping
 * `<`, `>` and `&` stops that; U+2028/U+2029 are escaped for older engines
 * that treat them as line breaks inside string literals. The result parses to
 * the same value.
 */
export function serializeForInlineScript(value: unknown): string {
  const json = JSON.stringify(value) ?? 'undefined';
  return json.replace(/[<>&\u2028\u2029]/g, (char) => UNSAFE_INLINE_SCRIPT_CHARS[char]!);
}
