export interface ParseOriginListOptions {
  /**
   * Reject plaintext origins other than loopback. A production allowlist entry
   * on `http://` would authorize credentialed cross-origin reads — the
   * HelpScout signature among them — over the clear.
   */
  requireHttps?: boolean;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Parses a comma-separated list of origins (`WEBSITE_ORIGINS`). Each entry must be a
 * bare origin exactly as a browser sends it in the `Origin` header: scheme, host, and
 * port only. A trailing slash or path would never match, so it is rejected at boot.
 */
export function parseOriginList(
  raw: string | undefined,
  options: ParseOriginListOptions = {}
): string[] {
  if (!raw) return [];
  const origins: string[] = [];
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`WEBSITE_ORIGINS: "${value}" is not a URL`);
    }
    if (url.origin !== value) {
      throw new Error(`WEBSITE_ORIGINS: "${value}" must be a bare origin such as ${url.origin}`);
    }
    if (options.requireHttps && url.protocol !== 'https:' && !LOOPBACK_HOSTS.has(url.hostname)) {
      throw new Error(`WEBSITE_ORIGINS: "${value}" must use https outside local development`);
    }
    origins.push(value);
  }
  return origins;
}
