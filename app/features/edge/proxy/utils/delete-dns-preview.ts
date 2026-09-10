/**
 * Builds the DNS impact preview shown before an Application Load Balancer is deleted.
 *
 * Deleting an ALB deletes exactly the DNSRecordSets its Gateway created — one per
 * custom hostname that resolves to a Datum-managed zone. The operator sets an owner
 * reference on those records and garbage-collects them by a label scoped to the
 * Gateway, so nothing else is ever removed. Records the user created themselves are
 * only unprotected, never deleted.
 *
 * @see https://github.com/datum-cloud/network-services-operator — internal/controller/gateway_dns_controller.go
 */
import { findProxyForRecord, isEligibleForProtect } from '@/features/edge/dns-records/utils';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import type { DnsZone } from '@/resources/dns-zones';
import {
  type HttpProxy,
  getDnsRecordProgrammedCondition,
  getDnsRecordProgrammedDisplay,
} from '@/resources/http-proxies';
import { getRecordHostname, isSystemManagedDnsRecord } from '@/utils/helpers/dns';

/** What deleting the ALB does to a hostname's Datum-managed DNS record. */
export type ProxyDnsDeleteState =
  /** Datum programmed a record for this hostname; it is removed with the ALB. */
  | 'will-delete'
  /** Hostname is not in a Datum DNS zone, so Datum never created a record for it. */
  | 'no-record'
  /** Datum has not programmed a record yet (verifying, conflicted, or failed). */
  | 'pending';

export type ProxyDnsRecordDetail = {
  type: string;
  value: string;
};

/**
 * One hostname's full DNS story: the record Datum created for it, and any records the
 * user owns at the same name.
 *
 * These are grouped rather than listed as separate "deleted" and "kept" sections
 * because a protected record only matches when its hostname is already one of the
 * proxy's hostnames — so the two lists would name the same hostname twice and read as
 * a contradiction. Grouping is what makes "Datum's record goes, yours stays" legible,
 * which is the whole question the delete dialog has to answer.
 */
export type ProxyDnsHostnameRow = {
  hostname: string;
  /** The record Datum created for this hostname. Removed with the ALB. */
  datumRecord: { state: ProxyDnsDeleteState } & Partial<ProxyDnsRecordDetail>;
  /** Records the user owns at this hostname that the ALB protects. Left in place. */
  yourRecords: ProxyDnsRecordDetail[];
};

/** Records for one zone, paired with the domain their relative names resolve against. */
export type ZoneRecords = {
  zoneDomain: string;
  records: IFlattenedDnsRecord[];
};

export type ProxyDnsDeletePreview = {
  hostnames: ProxyDnsHostnameRow[];
  /** Hostnames whose Datum-managed record is actually deleted. */
  deleteCount: number;
  /** User-owned records left in place across all hostnames. */
  keptCount: number;
};

type ZoneLike = Pick<DnsZone, 'name' | 'domainName'>;

const normalizeDomain = (value: string): string => value.trim().replace(/\.$/, '').toLowerCase();

/**
 * The most specific zone whose domain covers `hostname`, or undefined when none does.
 * Nested zones both match a deep hostname, so the longest domain wins.
 */
export function findZoneForHostname<T extends ZoneLike>(
  zones: T[],
  hostname: string
): T | undefined {
  const host = normalizeDomain(hostname);
  if (!host) return undefined;

  return zones
    .filter((zone) => {
      const domain = normalizeDomain(zone.domainName ?? '');
      if (!domain) return false;
      return host === domain || host.endsWith(`.${domain}`);
    })
    .sort((a, b) => normalizeDomain(b.domainName).length - normalizeDomain(a.domainName).length)
    .at(0);
}

/** The gateway-owned record this proxy created for `hostname`, if its zone has loaded. */
function findGatewayRecord(
  zoneRecords: ZoneRecords[],
  proxyName: string,
  hostname: string
): IFlattenedDnsRecord | undefined {
  const host = normalizeDomain(hostname);

  for (const { zoneDomain, records } of zoneRecords) {
    const match = records.find(
      (record) =>
        record.managedByGateway === true &&
        record.gatewaySourceName === proxyName &&
        normalizeDomain(getRecordHostname(record.name ?? '', zoneDomain)) === host
    );
    if (match) return match;
  }

  return undefined;
}

/** The records the user owns at `hostname` that this proxy protects. */
function findProtectedRecords(
  zoneRecords: ZoneRecords[],
  proxy: HttpProxy,
  hostname: string
): ProxyDnsRecordDetail[] {
  const host = normalizeDomain(hostname);

  return zoneRecords.flatMap(({ zoneDomain, records }) =>
    records.flatMap((record) => {
      if (record.managedByGateway) return [];
      if (isSystemManagedDnsRecord(record, zoneDomain)) return [];

      const recordHostname = getRecordHostname(record.name ?? '', zoneDomain);
      if (normalizeDomain(recordHostname) !== host) return [];

      const owner = findProxyForRecord([proxy], record, recordHostname, (candidate) =>
        isEligibleForProtect(candidate.type)
      );
      if (!owner) return [];

      return [{ type: record.type, value: record.value }];
    })
  );
}

/**
 * Group a proxy's DNS footprint by hostname: what deleting it removes, and what it
 * leaves behind.
 *
 * The per-hostname state is driven by the DNSRecordProgrammed condition, which is
 * already on the proxy — so it stays complete and correct when `zoneRecords` is empty
 * because the record query is slow, denied, or failed. Record type and value, and the
 * user's own protected records, are enrichment that appears only once records load.
 *
 * `yourRecords` reuses the same hostname+origin match the DNS zone table uses to badge
 * "Protected by Application Load Balancer". That match can under-report, so copy built
 * on it must never imply the list is exhaustive.
 */
export function buildProxyDnsDeletePreview({
  proxy,
  zoneRecords,
}: {
  proxy: HttpProxy;
  zoneRecords: ZoneRecords[];
}): ProxyDnsDeletePreview {
  const proxyName = proxy.name ?? '';

  const hostnames: ProxyDnsHostnameRow[] = (proxy.hostnames ?? []).map((hostname) => {
    const hostnameStatus = proxy.hostnameStatuses?.find((entry) => entry.hostname === hostname);
    const display = getDnsRecordProgrammedDisplay(getDnsRecordProgrammedCondition(hostnameStatus));
    const yourRecords = findProtectedRecords(zoneRecords, proxy, hostname);

    if (display !== 'programmed') {
      const state: ProxyDnsDeleteState = display === 'not-applicable' ? 'no-record' : 'pending';
      return { hostname, datumRecord: { state }, yourRecords };
    }

    const record = findGatewayRecord(zoneRecords, proxyName, hostname);
    return {
      hostname,
      datumRecord: { state: 'will-delete', type: record?.type, value: record?.value },
      yourRecords,
    };
  });

  return {
    hostnames,
    deleteCount: hostnames.filter((row) => row.datumRecord.state === 'will-delete').length,
    keptCount: hostnames.reduce((total, row) => total + row.yourRecords.length, 0),
  };
}
