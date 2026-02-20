import { isValidHttpUri } from '@/utils/helpers/validation.helper';

describe('isValidHttpUri', () => {
  describe('valid HTTP/HTTPS URIs', () => {
    it('accepts https URL with hostname', () => {
      expect(isValidHttpUri('https://proxy.example.com')).to.equal(true);
    });

    it('accepts http URL with hostname', () => {
      expect(isValidHttpUri('http://proxy.example.com')).to.equal(true);
    });

    it('accepts URL with port', () => {
      expect(isValidHttpUri('https://proxy.example.com:8080')).to.equal(true);
    });

    it('accepts URL with trailing slash (root path)', () => {
      expect(isValidHttpUri('https://proxy.example.com/')).to.equal(true);
    });

    it('accepts localhost', () => {
      expect(isValidHttpUri('http://localhost')).to.equal(true);
    });

    it('accepts IPv4 address', () => {
      expect(isValidHttpUri('https://192.168.1.1')).to.equal(true);
    });

    it('accepts IPv6 address', () => {
      expect(isValidHttpUri('https://[::1]')).to.equal(true);
    });
  });

  describe('invalid: empty or non-string', () => {
    it('rejects empty string', () => {
      expect(isValidHttpUri('')).to.equal(false);
    });

    it('rejects null', () => {
      expect(isValidHttpUri(null as unknown as string)).to.equal(false);
    });

    it('rejects undefined', () => {
      expect(isValidHttpUri(undefined as unknown as string)).to.equal(false);
    });

    it('rejects non-string types', () => {
      expect(isValidHttpUri(123 as unknown as string)).to.equal(false);
      expect(isValidHttpUri({} as unknown as string)).to.equal(false);
    });
  });

  describe('invalid: whitespace', () => {
    it('rejects leading whitespace', () => {
      expect(isValidHttpUri(' https://proxy.example.com')).to.equal(false);
    });

    it('rejects trailing whitespace', () => {
      expect(isValidHttpUri('https://proxy.example.com ')).to.equal(false);
    });
  });

  describe('invalid: empty authority', () => {
    it('rejects triple slash (empty host)', () => {
      expect(isValidHttpUri('https:///google.com')).to.equal(false);
    });

    it('rejects bare scheme with no host', () => {
      expect(isValidHttpUri('https://')).to.equal(false);
    });
  });

  describe('invalid: wrong protocol', () => {
    it('rejects ftp protocol', () => {
      expect(isValidHttpUri('ftp://proxy.example.com')).to.equal(false);
    });

    it('rejects file protocol', () => {
      expect(isValidHttpUri('file:///tmp/file')).to.equal(false);
    });
  });

  describe('invalid: path, query, or fragment', () => {
    it('rejects path component', () => {
      expect(isValidHttpUri('https://proxy.example.com/api')).to.equal(false);
    });

    it('rejects path that would parse host as path (https:///host case)', () => {
      expect(isValidHttpUri('https://proxy.example.com/www.google.com')).to.equal(false);
    });

    it('rejects query string', () => {
      expect(isValidHttpUri('https://proxy.example.com?foo=bar')).to.equal(false);
    });

    it('rejects fragment', () => {
      expect(isValidHttpUri('https://proxy.example.com#section')).to.equal(false);
    });
  });

  describe('invalid: malformed URL', () => {
    it('rejects missing scheme', () => {
      expect(isValidHttpUri('proxy.example.com')).to.equal(false);
    });

    it('rejects invalid URL format', () => {
      expect(isValidHttpUri('not-a-url')).to.equal(false);
    });
  });
});
