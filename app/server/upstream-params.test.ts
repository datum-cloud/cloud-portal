import { encodePathSegments, isDns1123Label, isDns1123Subdomain } from './upstream-params';
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

describe('isDns1123Subdomain', () => {
  it.each(['ctx-1', 'a.b', 'conv.v1.example', '0f8fad5b-d9cb-469f-a165-70867728950e'])(
    'accepts %p',
    (value) => {
      expect(isDns1123Subdomain(value)).toBe(true);
    }
  );

  it.each([...TRAVERSAL_AND_INJECTION, 'a..b', '.a', 'a.', `${'a'.repeat(63)}.`.repeat(4) + 'a'])(
    'rejects %p',
    (value) => {
      expect(isDns1123Subdomain(value)).toBe(false);
    }
  );
});

describe('encodePathSegments', () => {
  it('prefixes each segment with a slash', () => {
    expect(encodePathSegments('chat', 'conversations', 'ctx-1')).toBe('/chat/conversations/ctx-1');
  });

  it('encodes characters that would change the URL structure', () => {
    expect(encodePathSegments('a/b', '?x=1', '#f')).toBe('/a%2Fb/%3Fx%3D1/%23f');
  });
});
