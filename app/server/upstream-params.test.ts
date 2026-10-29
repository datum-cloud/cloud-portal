import { encodePathSegments, isDns1123Label, isLowercaseUuid } from './upstream-params';
import { describe, expect, it } from 'bun:test';

const TRAVERSAL_AND_INJECTION = [
  '',
  '.',
  '..',
  '../admin',
  '..%2Fadmin',
  '%2e%2e',
  'a/b',
  'a\\b',
  'p1?admin=true',
  'p1&admin=true',
  'p1#frag',
  'p1 ',
  'Project',
  '-leading',
  'trailing-',
];

describe('isDns1123Label', () => {
  it.each(['p1', 'my-project', 'a', '0abc9', 'a'.repeat(63)])('accepts %p', (value) => {
    expect(isDns1123Label(value)).toBe(true);
  });

  it.each([...TRAVERSAL_AND_INJECTION, 'a.b', 'a'.repeat(64)])('rejects %p', (value) => {
    expect(isDns1123Label(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isDns1123Label(undefined)).toBe(false);
    expect(isDns1123Label(42)).toBe(false);
  });
});

describe('isLowercaseUuid', () => {
  it.each(['0f8fad5b-d9cb-469f-a165-70867728950e', '00000000-0000-0000-0000-000000000000'])(
    'accepts %p',
    (value) => {
      expect(isLowercaseUuid(value)).toBe(true);
    }
  );

  it.each([
    ...TRAVERSAL_AND_INJECTION,
    '0F8FAD5B-D9CB-469F-A165-70867728950E',
    '0f8fad5b.d9cb.469f.a165.70867728950e',
    '0f8fad5bd9cb469fa16570867728950e',
    '0f8fad5b-d9cb-469f-a165-70867728950e.evil',
    '0f8fad5b-d9cb-469f-a165-70867728950e/..',
    'ctx-1',
  ])('rejects %p', (value) => {
    expect(isLowercaseUuid(value)).toBe(false);
  });
});

describe('encodePathSegments', () => {
  it('prefixes each segment with a slash', () => {
    expect(encodePathSegments('chat', 'conversations', 'ctx-1')).toBe('/chat/conversations/ctx-1');
  });

  it('encodes characters that would change the URL structure', () => {
    expect(encodePathSegments('a/b', '?x=1', '#f')).toBe('/a%2Fb/%3Fx%3D1/%23f');
  });
});
