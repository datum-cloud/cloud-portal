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

/**
 * Non-blocking warning when the entered name already includes the zone domain.
 *
 * dns-operator treats names without a trailing dot as relative and always
 * appends the zone, so `test.example.com` in zone `example.com` becomes
 * `test.example.com.example.com.`. Trailing-dot FQDNs are absolute and skip.
 *
 * @returns Warning string, or null when no warning applies
 */
export function getNameEndsWithZoneWarning(name: string, zoneDomain: string): string | null {
  const zone = (zoneDomain ?? '').replace(/\.$/, '');
  const trimmed = (name ?? '').trim();
  if (!trimmed || trimmed === '@' || !zone) return null;

  // Absolute FQDN — operator will not append the zone
  if (trimmed.endsWith('.')) return null;

  const nameLower = trimmed.toLowerCase();
  const zoneLower = zone.toLowerCase();
  const equalsZone = nameLower === zoneLower;
  const endsWithZone = nameLower.endsWith(`.${zoneLower}`);
  if (!equalsZone && !endsWithZone) return null;

  const resultingOwner = `${trimmed}.${zone}`;

  if (equalsZone) {
    return `This will create ${resultingOwner}. Use "@" for the zone apex.`;
  }

  const relativeLabel = trimmed.slice(0, trimmed.length - zone.length - 1);
  return `This will create ${resultingOwner}. Use "${relativeLabel}" to create ${trimmed}.`;
}
