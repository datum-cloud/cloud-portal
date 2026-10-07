import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import type { HostnameDnsRecordLike } from '@/resources/http-proxies';

/**
 * What adding one of a hostname's required DNS records to a Datum DNS zone
 * would take, judged against the records already in that zone.
 *
 * - `present` — the exact record is already in the zone; it just hasn't been
 *   seen on the Internet yet.
 * - `add` — nothing is in the way.
 * - `replace` — records at the same name block it (a CNAME can't share its
 *   name with anything; a TXT can't share with a CNAME) and must go first.
 * - `blocked` — the blocking record belongs to an ALB, so we won't touch it.
 * - `unsupported` — not a type we create here, or the name isn't in the zone.
 */
export type ZoneRecordPlan =
  | { kind: 'present' }
  | { kind: 'add'; name: string }
  | { kind: 'replace'; name: string; conflicts: IFlattenedDnsRecord[] }
  | { kind: 'blocked' }
  | { kind: 'unsupported' };

const stripDot = (value: string) => value.trim().replace(/\.$/, '').toLowerCase();

/** TXT values come back quoted from the zone; compare them unquoted. */
const normalizeValue = (type: string, value: string) => {
  const unquoted = value.trim().replace(/^"(.*)"$/, '$1');
  return type === 'TXT' ? unquoted : stripDot(unquoted);
};

/** Record name relative to the zone ("@" at the apex), or undefined when outside it. */
export function relativeRecordName(fqdn: string, zoneDomain: string): string | undefined {
  const name = stripDot(fqdn);
  const zone = stripDot(zoneDomain);
  if (name === zone) return '@';
  return name.endsWith(`.${zone}`) ? name.slice(0, -(zone.length + 1)) : undefined;
}

export function planZoneRecord(
  record: HostnameDnsRecordLike,
  zoneDomain: string,
  zoneRecords: IFlattenedDnsRecord[]
): ZoneRecordPlan {
  if (record.type !== 'CNAME' && record.type !== 'TXT') return { kind: 'unsupported' };

  const name = relativeRecordName(record.name, zoneDomain);
  // CNAMEs can't live at the apex; required records never ask for one there.
  if (!name || (record.type === 'CNAME' && name === '@')) return { kind: 'unsupported' };

  const atName = zoneRecords.filter((existing) => stripDot(existing.name) === name);
  const wanted = normalizeValue(record.type, record.content);

  const exact = atName.some(
    (existing) =>
      existing.type === record.type && normalizeValue(existing.type, existing.value) === wanted
  );
  if (exact) return { kind: 'present' };

  const conflicts = atName.filter((existing) =>
    record.type === 'CNAME' ? true : existing.type === 'CNAME'
  );
  if (conflicts.length === 0) return { kind: 'add', name };
  if (conflicts.some((existing) => existing.managedByGateway)) return { kind: 'blocked' };
  return { kind: 'replace', name, conflicts };
}
