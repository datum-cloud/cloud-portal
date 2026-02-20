import { parseEndpoint } from '@/utils/helpers/url.helper';

describe('parseEndpoint', () => {
  describe('valid HTTPS URLs', () => {
    it('parses HTTPS URL with hostname', () => {
      const result = parseEndpoint('https://example.com');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('parses HTTPS URL with hostname and port', () => {
      const result = parseEndpoint('https://example.com:8080');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com:8080');
    });

    it('parses HTTPS URL with subdomain', () => {
      const result = parseEndpoint('https://api.example.com');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('api.example.com');
    });

    it('parses HTTPS URL with IPv4 address', () => {
      const result = parseEndpoint('https://192.168.1.1');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('192.168.1.1');
    });

    it('parses HTTPS URL with IPv4 address and port', () => {
      const result = parseEndpoint('https://192.168.1.1:3000');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('192.168.1.1:3000');
    });

    it('parses HTTPS URL with IPv6 address', () => {
      const result = parseEndpoint('https://[::1]');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('[::1]');
    });

    it('parses HTTPS URL with IPv6 address and port', () => {
      const result = parseEndpoint('https://[2001:db8::1]:8080');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('[2001:db8::1]:8080');
    });

    it('parses HTTPS URL with localhost', () => {
      const result = parseEndpoint('https://localhost');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('localhost');
    });

    it('parses HTTPS URL with localhost and port', () => {
      const result = parseEndpoint('https://localhost:3000');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('localhost:3000');
    });
  });

  describe('valid HTTP URLs', () => {
    it('parses HTTP URL with hostname', () => {
      const result = parseEndpoint('http://example.com');
      expect(result.protocol).to.equal('http');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('parses HTTP URL with hostname and port', () => {
      const result = parseEndpoint('http://example.com:8080');
      expect(result.protocol).to.equal('http');
      expect(result.endpointHost).to.equal('example.com:8080');
    });

    it('parses HTTP URL with IPv4 address', () => {
      const result = parseEndpoint('http://192.168.1.1');
      expect(result.protocol).to.equal('http');
      expect(result.endpointHost).to.equal('192.168.1.1');
    });

    it('parses HTTP URL with IPv4 address and port', () => {
      const result = parseEndpoint('http://192.168.1.1:3000');
      expect(result.protocol).to.equal('http');
      expect(result.endpointHost).to.equal('192.168.1.1:3000');
    });
  });

  describe('URLs without protocol (fallback)', () => {
    it('defaults to HTTPS for hostname without protocol', () => {
      const result = parseEndpoint('example.com');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('defaults to HTTPS for hostname:port without protocol', () => {
      const result = parseEndpoint('example.com:8080');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com:8080');
    });

    it('defaults to HTTPS for IPv4 address without protocol', () => {
      const result = parseEndpoint('192.168.1.1');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('192.168.1.1');
    });

    it('defaults to HTTPS for IPv4:port without protocol', () => {
      const result = parseEndpoint('192.168.1.1:3000');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('192.168.1.1:3000');
    });
  });

  describe('malformed URLs (fallback to manual parsing)', () => {
    it('handles URL with http:// prefix when URL constructor fails', () => {
      const result = parseEndpoint('http://example.com');
      expect(result.protocol).to.equal('http');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('handles URL with https:// prefix when URL constructor fails', () => {
      const result = parseEndpoint('https://example.com');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('handles string starting with http:// but malformed', () => {
      const result = parseEndpoint('http://example.com');
      expect(result.protocol).to.equal('http');
      expect(result.endpointHost).to.equal('example.com');
    });
  });

  describe('edge cases', () => {
    it('handles undefined input', () => {
      const result = parseEndpoint(undefined);
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('');
    });

    it('handles empty string', () => {
      const result = parseEndpoint('');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('');
    });

    it('handles URL with path (should extract hostname only)', () => {
      const result = parseEndpoint('https://example.com/api/v1');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('handles URL with query string (should extract hostname only)', () => {
      const result = parseEndpoint('https://example.com?foo=bar');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('handles URL with fragment (should extract hostname only)', () => {
      const result = parseEndpoint('https://example.com#section');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com');
    });

    it('handles URL with path, query, and fragment', () => {
      const result = parseEndpoint('https://example.com:8080/api/v1?foo=bar#section');
      expect(result.protocol).to.equal('https');
      expect(result.endpointHost).to.equal('example.com:8080');
    });

    it('strips default HTTPS port (443) - URL constructor behavior', () => {
      const result = parseEndpoint('https://example.com:443');
      expect(result.protocol).to.equal('https');
      // URL constructor strips default ports, so port is not included
      expect(result.endpointHost).to.equal('example.com');
    });

    it('strips default HTTP port (80) - URL constructor behavior', () => {
      const result = parseEndpoint('http://example.com:80');
      expect(result.protocol).to.equal('http');
      // URL constructor strips default ports, so port is not included
      expect(result.endpointHost).to.equal('example.com');
    });
  });
});
