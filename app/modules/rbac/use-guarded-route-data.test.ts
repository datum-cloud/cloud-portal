/// <reference types="bun-types/test" />
import { assertNotRestricted } from './use-guarded-route-data';
import { describe, expect, test } from 'bun:test';

describe('assertNotRestricted', () => {
  test('throws when loader data is restricted', () => {
    expect(() => assertNotRestricted({ restricted: true })).toThrow(/restricted loader data/i);
  });

  test('returns the unrestricted shape unchanged when allowed', () => {
    const input = { restricted: false, data: { name: 'x' }, companions: { y: 1 } } as const;
    const result = assertNotRestricted(input);
    expect(result).toEqual({ data: { name: 'x' }, companions: { y: 1 } });
  });
});
