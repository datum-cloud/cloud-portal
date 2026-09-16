import { isSessionlessPath } from './auth';
import { describe, expect, test } from 'bun:test';

describe('isSessionlessPath', () => {
  test('skips session refresh on publicly cacheable PWA URLs', () => {
    expect(isSessionlessPath('/manifest.webmanifest')).toBe(true);
    expect(isSessionlessPath('/sw.js')).toBe(true);
  });

  test('still authenticates HTML and API requests', () => {
    expect(isSessionlessPath('/')).toBe(false);
    expect(isSessionlessPath('/api/graphql')).toBe(false);
    expect(isSessionlessPath('/robots.txt')).toBe(false);
  });
});
