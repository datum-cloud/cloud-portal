/** Lowercased, trimmed, without a trailing dot or a leading wildcard label. */
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\.$/, '').replace(/^\*\./, '');

/**
 * Whether `domainName` covers `hostname`: equal to it, or a parent of it.
 * Wildcards are judged by their base, so `*.app.example.com` is covered by
 * `app.example.com` and `example.com`.
 */
export function coversHostname(domainName: string | undefined, hostname: string): boolean {
  const domain = normalize(domainName ?? '');
  const host = normalize(hostname);
  if (!domain || !host) return false;
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * The most specific Domain (or DNS zone) covering a hostname. Nested ones both
 * match a deep hostname, so the longest domain wins.
 */
export function findCoveringDomain<T extends { domainName?: string }>(
  domains: T[],
  hostname: string
): T | undefined {
  return domains
    .filter((domain) => coversHostname(domain.domainName, hostname))
    .sort((a, b) => normalize(b.domainName ?? '').length - normalize(a.domainName ?? '').length)
    .at(0);
}
