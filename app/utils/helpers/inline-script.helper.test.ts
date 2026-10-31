import { serializeForInlineScript } from './inline-script.helper';
import { describe, expect, test } from 'vitest';

describe('serializeForInlineScript', () => {
  test('a value containing </script><script> renders inert', () => {
    const env = { appName: '</script><script>alert(1)</script>' };
    const html = `<script>window.ENV = ${serializeForInlineScript(env)}</script>`;

    // Only the wrapper's own tags remain; the payload cannot close the element.
    expect(html.match(/<\/?script/gi)).toEqual(['<script', '</script']);
    expect(html).not.toContain('<script>alert');
  });

  test('round-trips to the same value', () => {
    const value = { a: '<b>&amp;</b>', line: 'x\u2028y\u2029z', n: 1, nested: [null, true] };
    const serialized = serializeForInlineScript(value);

    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(serialized)).toEqual(value);
  });

  test('undefined serializes to a valid expression', () => {
    expect(serializeForInlineScript(undefined)).toBe('undefined');
  });
});
