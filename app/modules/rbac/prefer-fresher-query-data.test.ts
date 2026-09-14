import { preferFresherQueryData } from './prefer-fresher-query-data';
import { describe, expect, test } from 'bun:test';

describe('preferFresherQueryData', () => {
  test('seeds empty cache with the incoming value', () => {
    expect(preferFresherQueryData(undefined, { resourceVersion: '1', name: 'a' })).toEqual({
      resourceVersion: '1',
      name: 'a',
    });
  });

  test('keeps a watched object when the loader snapshot is older', () => {
    const watched = { resourceVersion: '12', status: 'Ready' };
    const loader = { resourceVersion: '8', status: 'Pending' };
    expect(preferFresherQueryData(watched, loader)).toBe(watched);
  });

  test('takes a newer loader snapshot over cache', () => {
    const cache = { resourceVersion: '8', status: 'Pending' };
    const loader = { resourceVersion: '12', status: 'Ready' };
    expect(preferFresherQueryData(cache, loader)).toBe(loader);
  });

  test('does not block list seeds that have no resourceVersion', () => {
    const cache = [{ name: 'a' }];
    const incoming = [{ name: 'a' }, { name: 'b' }];
    expect(preferFresherQueryData(cache, incoming)).toBe(incoming);
  });
});
