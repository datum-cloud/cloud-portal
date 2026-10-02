/**
 * Parses an endpoint URL to extract the protocol and hostname:port.
 *
 * @param endpoint - The endpoint URL string (e.g., "https://example.com:8080" or "http://192.168.1.1")
 * @returns An object containing the protocol ('http' | 'https') and endpointHost (hostname:port or hostname)
 *
 * @example
 * parseEndpoint('https://example.com:8080')
 * // { protocol: 'https', endpointHost: 'example.com:8080' }
 *
 * @example
 * parseEndpoint('http://192.168.1.1')
 * // { protocol: 'http', endpointHost: '192.168.1.1' }
 *
 * @example
 * parseEndpoint('example.com')
 * // { protocol: 'https', endpointHost: 'example.com' }
 */
export function parseEndpoint(endpoint?: string): {
  protocol: 'http' | 'https';
  endpointHost: string;
} {
  let protocol: 'http' | 'https' = 'https';
  let endpointHost = '';

  if (endpoint) {
    try {
      const url = new URL(endpoint);
      // If URL constructor succeeds but produces empty hostname, fall back to manual parsing
      if (!url.hostname) {
        throw new Error('Empty hostname');
      }
      protocol = url.protocol === 'http:' ? 'http' : 'https';
      endpointHost = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    } catch {
      // If parsing fails, try to extract protocol manually
      if (endpoint.startsWith('http://')) {
        protocol = 'http';
        endpointHost = endpoint.replace(/^https?:\/\//, '');
      } else if (endpoint.startsWith('https://')) {
        protocol = 'https';
        endpointHost = endpoint.replace(/^https?:\/\//, '');
      } else {
        endpointHost = endpoint;
      }
    }
  }

  return { protocol, endpointHost };
}

/**
 * Normalize a URL reported by an external source (RDAP/WHOIS registrar
 * records, for example) into something safe to put in an anchor `href`.
 *
 * Registrar URLs arrive in every shape: `https://www.namecheap.com`,
 * `http://namecheap.com/`, or a bare `www.namecheap.com`. Bare hosts get
 * `https://` prepended. Anything that is not http(s) once parsed (javascript:,
 * data:, mailto:, garbage) returns `null` so the caller falls back to plain
 * text instead of rendering a dangerous link.
 *
 * The host must contain a dot. That deliberately rejects bare words such as
 * "Private" that show up in registrar fields, and as a side effect also
 * rejects `localhost` and IPv6 literals, which never identify a registrar.
 */
export function toExternalHref(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}
