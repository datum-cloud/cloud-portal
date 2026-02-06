import { isValidHttpUri } from '../validation.helper';
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

describe('isValidHttpUri', () => {
  describe('valid HTTP/HTTPS URIs', () => {
    test('accepts https URL with hostname', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com'), true);
    });

    test('accepts http URL with hostname', () => {
      assert.equal(isValidHttpUri('http://proxy.example.com'), true);
    });

    test('accepts URL with port', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com:8080'), true);
    });

    test('accepts URL with trailing slash (root path)', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com/'), true);
    });

    test('accepts localhost', () => {
      assert.equal(isValidHttpUri('http://localhost'), true);
    });

    test('accepts IPv4 address', () => {
      assert.equal(isValidHttpUri('https://192.168.1.1'), true);
    });

    test('accepts IPv6 address', () => {
      assert.equal(isValidHttpUri('https://[::1]'), true);
    });
  });

  describe('invalid: empty or non-string', () => {
    test('rejects empty string', () => {
      assert.equal(isValidHttpUri(''), false);
    });

    test('rejects null', () => {
      assert.equal(isValidHttpUri(null as unknown as string), false);
    });

    test('rejects undefined', () => {
      assert.equal(isValidHttpUri(undefined as unknown as string), false);
    });

    test('rejects non-string types', () => {
      assert.equal(isValidHttpUri(123 as unknown as string), false);
      assert.equal(isValidHttpUri({} as unknown as string), false);
    });
  });

  describe('invalid: whitespace', () => {
    test('rejects leading whitespace', () => {
      assert.equal(isValidHttpUri(' https://proxy.example.com'), false);
    });

    test('rejects trailing whitespace', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com '), false);
    });
  });

  describe('invalid: empty authority', () => {
    test('rejects triple slash (empty host)', () => {
      assert.equal(isValidHttpUri('https:///google.com'), false);
    });

    test('rejects bare scheme with no host', () => {
      assert.equal(isValidHttpUri('https://'), false);
    });
  });

  describe('invalid: wrong protocol', () => {
    test('rejects ftp protocol', () => {
      assert.equal(isValidHttpUri('ftp://proxy.example.com'), false);
    });

    test('rejects file protocol', () => {
      assert.equal(isValidHttpUri('file:///tmp/file'), false);
    });
  });

  describe('invalid: path, query, or fragment', () => {
    test('rejects path component', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com/api'), false);
    });

    test('rejects path that would parse host as path (https:///host case)', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com/www.google.com'), false);
    });

    test('rejects query string', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com?foo=bar'), false);
    });

    test('rejects fragment', () => {
      assert.equal(isValidHttpUri('https://proxy.example.com#section'), false);
    });
  });

  describe('invalid: malformed URL', () => {
    test('rejects missing scheme', () => {
      assert.equal(isValidHttpUri('proxy.example.com'), false);
    });

    test('rejects invalid URL format', () => {
      assert.equal(isValidHttpUri('not-a-url'), false);
    });
  });
});
