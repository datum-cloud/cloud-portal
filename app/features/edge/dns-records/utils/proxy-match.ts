import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import type { HttpProxy } from '@/resources/http-proxies';

/** Row is locked when lockReason is set (generic; e.g. AI Edge, future read-only zone, etc.) */
export function isRowLocked(row: IFlattenedDnsRecord): boolean {
  return !!row.lockReason;
}

/** Normalize endpoint for reuse matching (lowercase, trim, no trailing slash) */
export function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().toLowerCase().replace(/\/+$/, '') || '';
}

/** Find existing proxy with same backend endpoint (issue #613 reuse) */
export function findProxyByEndpoint(proxies: HttpProxy[], endpoint: string): HttpProxy | undefined {
  const normalized = normalizeEndpoint(endpoint);
  if (!normalized) return undefined;
  return proxies.find((p) => p.endpoint && normalizeEndpoint(p.endpoint) === normalized);
}

/**
 * Find the proxy that protects this DNS record by matching both hostname and origin (endpoint).
 * When multiple proxies share the same hostname (e.g. hello.com and vercel app both on mdj-test.online),
 * we must match by the record's backend so we show the correct proxy (Remove / View) per record.
 *
 * @param isEligibleForProtect - Predicate to filter record types that can be protected (e.g. A, AAAA, CNAME, ALIAS).
 */
export function findProxyForRecord(
  proxies: HttpProxy[],
  record: IFlattenedDnsRecord,
  hostname: string,
  isEligibleForProtect: (record: IFlattenedDnsRecord) => boolean
): HttpProxy | undefined {
  if (!isEligibleForProtect(record)) return undefined;
  const backendHost = (record.value ?? '').replace(/\.$/, '');
  if (!backendHost) return undefined;
  const isIpOrigin = record.type === 'A' || record.type === 'AAAA';
  const expectedEndpoint = isIpOrigin ? `http://${backendHost}` : `https://${backendHost}`;
  const normalizedEndpoint = normalizeEndpoint(expectedEndpoint);
  return proxies.find(
    (p) =>
      p.hostnames?.some((h) => h?.replace(/\.$/, '').toLowerCase() === hostname.toLowerCase()) &&
      p.endpoint &&
      normalizeEndpoint(p.endpoint) === normalizedEndpoint
  );
}
