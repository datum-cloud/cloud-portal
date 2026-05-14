import { httpProxySchema } from '@/resources/http-proxies';

/**
 * Builds a minimally valid input for `httpProxySchema`. Individual tests
 * override only the field under test, keeping each assertion focused.
 */
function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'my-proxy',
    chosenName: 'My Proxy',
    protocol: 'https' as const,
    endpointHost: 'api.example.com',
    ...overrides,
  };
}

function endpointHostIssue(input: ReturnType<typeof makeInput>) {
  const result = httpProxySchema.safeParse(input);
  if (result.success) return null;
  return result.error.issues.find((issue) => issue.path[0] === 'endpointHost') ?? null;
}

describe('httpProxySchema – endpointHost (Origin)', () => {
  describe('valid origins are accepted', () => {
    it('accepts a fully qualified hostname', () => {
      expect(
        httpProxySchema.safeParse(makeInput({ endpointHost: 'api.example.com' })).success
      ).to.equal(true);
    });

    it('accepts a multi-label subdomain', () => {
      expect(
        httpProxySchema.safeParse(makeInput({ endpointHost: 'api.staging.example.com' })).success
      ).to.equal(true);
    });

    it('accepts a hostname with a port', () => {
      expect(
        httpProxySchema.safeParse(makeInput({ endpointHost: 'api.example.com:8080' })).success
      ).to.equal(true);
    });

    it('accepts an IPv4 address', () => {
      expect(
        httpProxySchema.safeParse(makeInput({ endpointHost: '203.0.113.1' })).success
      ).to.equal(true);
    });

    it('accepts an IPv4 address with a port', () => {
      expect(
        httpProxySchema.safeParse(makeInput({ endpointHost: '203.0.113.1:8080' })).success
      ).to.equal(true);
    });
  });

  describe('rejects single-label hostnames (the case that previously hit the API)', () => {
    it('rejects a bare word like "hello"', () => {
      const issue = endpointHostIssue(makeInput({ endpointHost: 'hello' }));
      expect(issue, 'should produce an endpointHost issue').to.not.equal(null);
      expect(issue?.message).to.match(/at least two segments separated by dots/i);
    });

    it('rejects "localhost"', () => {
      const issue = endpointHostIssue(makeInput({ endpointHost: 'localhost' }));
      expect(issue).to.not.equal(null);
    });

    it('rejects a single label with a port ("hello:8080")', () => {
      const issue = endpointHostIssue(makeInput({ endpointHost: 'hello:8080' }));
      expect(issue).to.not.equal(null);
    });
  });

  describe('rejects other malformed origins', () => {
    it('rejects an empty string', () => {
      const issue = endpointHostIssue(makeInput({ endpointHost: '' }));
      expect(issue).to.not.equal(null);
      expect(issue?.message).to.match(/required/i);
    });

    it('trims surrounding whitespace before validating', () => {
      // Surrounding whitespace is stripped by the schema; the trimmed value
      // is still a valid FQDN, so the parse should succeed.
      expect(
        httpProxySchema.safeParse(makeInput({ endpointHost: '  api.example.com  ' })).success
      ).to.equal(true);
    });

    it('rejects a value containing a protocol scheme', () => {
      // "https://api.example.com" parses as hostname "https" + port "//api.example.com" -> invalid port
      const issue = endpointHostIssue(makeInput({ endpointHost: 'https://api.example.com' }));
      expect(issue).to.not.equal(null);
    });

    it('rejects an invalid port', () => {
      const issue = endpointHostIssue(makeInput({ endpointHost: 'api.example.com:99999' }));
      expect(issue).to.not.equal(null);
    });

    it('rejects more than one colon (multiple ports)', () => {
      const issue = endpointHostIssue(makeInput({ endpointHost: 'api.example.com:80:80' }));
      expect(issue).to.not.equal(null);
    });
  });

  describe('TLS hostname requirement for IP-based HTTPS origins', () => {
    it('requires tlsHostname when endpoint is HTTPS + IP', () => {
      const result = httpProxySchema.safeParse(
        makeInput({ endpointHost: '203.0.113.1', protocol: 'https' })
      );
      expect(result.success).to.equal(false);
      if (!result.success) {
        const tlsIssue = result.error.issues.find((i) => i.path[0] === 'tlsHostname');
        expect(tlsIssue).to.not.equal(undefined);
      }
    });

    it('does not require tlsHostname when endpoint is HTTP + IP', () => {
      const result = httpProxySchema.safeParse(
        makeInput({ endpointHost: '203.0.113.1', protocol: 'http' })
      );
      expect(result.success).to.equal(true);
    });
  });
});
