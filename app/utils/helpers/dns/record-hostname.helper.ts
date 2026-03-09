/**
 * Normalized hostname for a DNS record in a zone (no trailing dot).
 * - @ or empty name → zone domain
 * - Name with dots → treated as FQDN, trailing dot stripped
 * - Simple label → name.zoneDomain
 */
export function getRecordHostname(recordName: string, zoneDomain: string): string {
  const domain = zoneDomain.replace(/\.$/, '');
  const name = (recordName ?? '').replace(/\.$/, '');
  if (name === '' || name === '@') return domain;
  if (name.includes('.')) return name;
  return `${name}.${domain}`;
}
