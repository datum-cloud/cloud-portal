import type { Context } from 'hono';
import { getConnInfo } from 'hono/bun';

/**
 * Proxies in front of the portal that append to `X-Forwarded-For`. In every
 * deployed environment that is the Envoy Gateway on `external-gateway`: a
 * passthrough L4 load balancer hands it the TCP connection, Envoy terminates
 * TLS, and no ClientTrafficPolicy sets `clientIPDetection`, so Envoy trusts
 * no incoming XFF and appends the peer address it saw. The entry Envoy added
 * is therefore the last one; anything to its left came from the client.
 *
 * Override with `TRUSTED_PROXY_HOPS` if another proxy is put in front of
 * Envoy, or `0` to ignore XFF and use the socket address.
 */
export const DEFAULT_TRUSTED_PROXY_HOPS = 1;

/** `TRUSTED_PROXY_HOPS` when it is a non-negative integer, else the default. */
export function resolveTrustedProxyHops(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env.TRUSTED_PROXY_HOPS?.trim();
  if (!raw) return DEFAULT_TRUSTED_PROXY_HOPS;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : DEFAULT_TRUSTED_PROXY_HOPS;
}

/**
 * The address the outermost trusted proxy saw: the `hops`-th entry from the
 * right. Entries further left are client-supplied and never used. Undefined
 * when the header is shorter than the trusted chain or the entry is not an IP.
 */
export function trustedForwardedAddress(
  header: string | undefined,
  hops: number
): string | undefined {
  if (!header || hops <= 0) return undefined;
  const entries = header
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidate = entries[entries.length - hops];
  return candidate && isValidIP(candidate) ? candidate : undefined;
}

/** Peer address of the TCP connection; undefined outside Bun.serve (tests). */
function socketAddress(c: Context): string | undefined {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
}

/**
 * Client IP for rate-limit keys, logs and the audit address forwarded
 * upstream. `CF-Connecting-IP`, `X-Real-IP` and the leftmost XFF entry are
 * ignored: nothing in front of the portal sets them, so a client can.
 */
export function getClientIP(
  c: Context,
  hops: number = resolveTrustedProxyHops()
): string | undefined {
  return trustedForwardedAddress(c.req.header('X-Forwarded-For'), hops) ?? socketAddress(c);
}

/** Basic IP validation to prevent header injection attacks. */
export function isValidIP(ip: string): boolean {
  // IPv4: 1.2.3.4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6: simplified check for common formats
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Regex.test(ip)) {
    // Validate each octet is 0-255
    return ip.split('.').every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}
