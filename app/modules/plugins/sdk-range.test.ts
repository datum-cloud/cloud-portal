/// <reference types="bun-types/test" />
import { isSdkCompatible, satisfies } from './sdk-range';
import { HOST_SDK_VERSION } from './types';
import { describe, expect, test } from 'bun:test';

describe('satisfies', () => {
  test.each([
    // [version, range, expected]
    ['1.0.0', '1.0.0', true],
    ['1.0.0', '1.0.1', false],
    ['1.0.0', '^1.0.0', true],
    ['1.5.2', '^1.0.0', true],
    ['2.0.0', '^1.0.0', false],
    ['1.0.0', '^1.2.0', false], // host older than caret floor
    ['1.0.0', '~1.0.0', true],
    ['1.0.9', '~1.0.0', true],
    ['1.1.0', '~1.0.0', false],
    ['1.0.0', '>=1.0.0', true],
    ['1.0.0', '>1.0.0', false],
    ['1.0.0', '<2.0.0', true],
    ['1.0.0', '<1.0.0', false],
    ['1.0.0', '>=1.0.0 <2.0.0', true],
    ['2.0.0', '>=1.0.0 <2.0.0', false],
    ['1.0.0', '1.x', true],
    ['1.9.9', '1.x', true],
    ['2.0.0', '1.x', false],
    ['1.0.0', '1', true],
    ['1.2.0', '1.2.x', true],
    ['1.3.0', '1.2.x', false],
    ['1.0.0', '*', true],
    ['1.0.0', 'x', true],
    ['1.0.0', '1.0.0 || 2.0.0', true],
    ['2.0.0', '1.0.0 || 2.0.0', true],
    ['3.0.0', '1.0.0 || 2.0.0', false],
    ['1.0.0', '^0.1.0', false], // 0.x caret excludes 1.0.0
  ])('satisfies(%s, %s) === %s', (version, range, expected) => {
    expect(satisfies(version, range)).toBe(expected);
  });

  test('fails closed on an unparseable version', () => {
    expect(satisfies('not-a-version', '^1.0.0')).toBe(false);
  });

  test('fails closed on an empty range', () => {
    expect(satisfies('1.0.0', '')).toBe(false);
  });
});

describe('isSdkCompatible', () => {
  test('host SDK satisfies its own exact version', () => {
    expect(isSdkCompatible(HOST_SDK_VERSION)).toBe(true);
  });

  test('host SDK satisfies a caret range at its major', () => {
    expect(isSdkCompatible('^1.0.0')).toBe(true);
  });

  test('host SDK does not satisfy a future major range', () => {
    expect(isSdkCompatible('^2.0.0')).toBe(false);
  });
});
