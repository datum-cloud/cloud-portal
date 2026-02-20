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
