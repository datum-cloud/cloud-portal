import type { ZoneRecords } from '@/features/edge/proxy/utils/delete-dns-preview';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import {
  type ConditionLike,
  DnsRecordProgrammedReason,
  getDnsRecordProgrammedIssue,
} from '@/resources/http-proxies/http-proxy.conditions';
import { getRecordHostname, isSystemManagedDnsRecord } from '@/utils/helpers/dns';
import {
  formatAlbHostnameDnsConflict,
  formatDnsError,
  parseDnsRrsetConflict,
} from '@/utils/helpers/dns/error-formatting.helper';

export type HostnameDnsIssue = { label: string; message: string };

/** Types that cannot share an owner name with the ALIAS Datum programs for an ALB hostname. */
const ALIAS_OCCUPYING_TYPES = new Set(['A', 'AAAA', 'CNAME', 'ALIAS']);

const normalizeDomain = (value: string): string => value.trim().replace(/\.$/, '').toLowerCase();

function recordsAtHostname(
  zoneRecords: ZoneRecords[],
  hostname: string
): { zoneDomain: string; records: IFlattenedDnsRecord[] } | undefined {
  const host = normalizeDomain(hostname);
  if (!host) return undefined;

  for (const { zoneDomain, records } of zoneRecords) {
    const matches = records.filter((record) => {
      const recordHost = normalizeDomain(getRecordHostname(record.name ?? '', zoneDomain));
      if (recordHost === host) return true;
      // Hostname may be a relative label (`test`) rather than an FQDN.
      return normalizeDomain(record.name ?? '') === host;
    });
    if (matches.length > 0) return { zoneDomain, records: matches };
  }

  return undefined;
}

function isGatewayRecord(record: IFlattenedDnsRecord, proxyName?: string): boolean {
  if (record.managedByGateway !== true) return false;
  if (!proxyName) return true;
  return record.gatewaySourceName === proxyName;
}

function isManualRecord(record: IFlattenedDnsRecord, zoneDomain: string): boolean {
  return record.managedByGateway !== true && !isSystemManagedDnsRecord(record, zoneDomain);
}

function isDnsRecordProgrammingError(record: IFlattenedDnsRecord): boolean {
  const status = record.status;
  if (!status || status.isProgrammed === true) return false;
  const message = status.message ?? '';
  if (parseDnsRrsetConflict(message)) return true;
  return (
    status.programmedReason === 'PDNSError' ||
    status.programmedReason === 'InvalidDNSRecordSet' ||
    status.programmedReason === 'Conflict'
  );
}

function issueFromZoneRecords(
  hostname: string,
  proxyName: string | undefined,
  zoneRecords: ZoneRecords[],
  options?: { allowOccupyingHeuristic?: boolean }
): HostnameDnsIssue | undefined {
  const atName = recordsAtHostname(zoneRecords, hostname);
  if (!atName) return undefined;

  const gateway = atName.records.find((record) => isGatewayRecord(record, proxyName));
  const occupyingManual = atName.records.filter(
    (record) => isManualRecord(record, atName.zoneDomain) && ALIAS_OCCUPYING_TYPES.has(record.type)
  );
  const gatewayMessage = gateway?.status?.message ?? '';
  const collidingName =
    parseDnsRrsetConflict(gatewayMessage)?.recordName ||
    (occupyingManual[0]
      ? getRecordHostname(occupyingManual[0].name ?? '', atName.zoneDomain)
      : undefined) ||
    hostname;

  if (
    parseDnsRrsetConflict(gatewayMessage) ||
    (options?.allowOccupyingHeuristic !== false && occupyingManual.length > 0)
  ) {
    return {
      label: 'DNS conflict',
      message: formatAlbHostnameDnsConflict(gatewayMessage || undefined, collidingName),
    };
  }

  if (gateway && isDnsRecordProgrammingError(gateway)) {
    return {
      label: 'DNS failed',
      message: formatDnsError(
        gatewayMessage || 'Datum could not program the DNS record for this hostname.'
      ),
    };
  }

  return undefined;
}

/**
 * Actionable DNS problem for an ALB hostname.
 *
 * The HTTPProxy `DNSRecordProgrammed` condition often stays on "pending"
 * while the DnsRecordSet already failed — PowerDNS rejected the ALB-managed
 * ALIAS because a manual record occupies the name. We therefore also look at
 * the zone's records, not just the proxy condition.
 */
export function resolveHostnameDnsIssue({
  hostname,
  dns,
  condition,
  proxyName,
  zoneRecords,
}: {
  hostname: string;
  dns: 'programmed' | 'not-applicable' | 'pending';
  condition?: ConditionLike;
  proxyName?: string;
  zoneRecords: ZoneRecords[];
}): HostnameDnsIssue | undefined {
  if (dns === 'programmed' || dns === 'not-applicable') {
    return getDnsRecordProgrammedIssue(condition);
  }

  const fromCondition = getDnsRecordProgrammedIssue(condition);
  if (fromCondition?.label === 'DNS conflict' || fromCondition?.label === 'DNS not delegated') {
    return fromCondition;
  }

  const fromRecords = issueFromZoneRecords(hostname, proxyName, zoneRecords, {
    // DomainNotVerified: Datum has not tried to write the ALIAS yet, so a
    // pre-existing CNAME is not yet a programming clash.
    allowOccupyingHeuristic: condition?.reason !== DnsRecordProgrammedReason.DomainNotVerified,
  });
  if (fromRecords) return fromRecords;

  return fromCondition;
}
