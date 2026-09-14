/**
 * Formats DNS programming errors (usually from PowerDNS) into copy a person
 * can act on. The API often wraps the real message in `status 422: {"error":"..."}`.
 */

export type DnsRrsetConflict = {
  /** FQDN without a trailing dot, e.g. `testing.mdj-test.online`. */
  recordName: string;
  /** The type that failed to program, e.g. `ALIAS`. */
  recordType: string;
};

/** Pull the inner PDNS message out of `status 422: {"error":"..."}` wrappers. */
export function unwrapDnsError(errorMessage: string): string {
  if (!errorMessage) return errorMessage;
  const jsonMatch = errorMessage.match(/\{[^}]*"error"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].replace(/\\"/g, '"');
  }
  return errorMessage;
}

/**
 * True when PowerDNS rejected an RRset because another record already occupies
 * that name — the usual outcome of a manual CNAME/ALIAS plus an ALB-managed one.
 */
export function parseDnsRrsetConflict(errorMessage: string): DnsRrsetConflict | undefined {
  if (!errorMessage) return undefined;
  const inner = unwrapDnsError(errorMessage);
  if (!/conflicts with pre-existing rrset/i.test(inner)) return undefined;
  const match = inner.match(/RRset\s+(\S+)\s+IN\s+([A-Z]+)/i);
  return {
    recordName: (match?.[1] ?? '').replace(/\.$/, ''),
    recordType: (match?.[2] ?? '').toUpperCase(),
  };
}

/**
 * Copy for a pre-existing RRset conflict. `managedByAlb` is the record Datum
 * tried to create after the hostname was attached to a load balancer.
 */
export function formatDnsRecordConflictError(
  errorMessage: string,
  options?: { managedByAlb?: boolean }
): string {
  const conflict = parseDnsRrsetConflict(errorMessage);
  if (!conflict) {
    return formatDnsError(errorMessage);
  }

  const atName = conflict.recordName ? ` at ${conflict.recordName}` : ' at this name';
  const typeLabel = conflict.recordType || 'record';

  if (options?.managedByAlb) {
    return `A DNS record you created already exists${atName}, so Datum can't add this ALB-managed ${typeLabel}. Remove the manual record, then Datum can take over.`;
  }

  if (typeLabel === 'CNAME' || typeLabel === 'ALIAS') {
    return `${typeLabel} records can't share a name with another record type. Remove the existing record${atName}, or use a different name.`;
  }

  return `This ${typeLabel} conflicts with an existing record${atName}. Remove the other record, or use a different name.`;
}

/** Hostname-card copy when Datum can't program DNS because a manual record exists. */
export function formatAlbHostnameDnsConflict(errorMessage?: string, hostname?: string): string {
  const conflict = errorMessage ? parseDnsRrsetConflict(errorMessage) : undefined;
  const name = conflict?.recordName || hostname;
  const atName = name ? ` (${name})` : '';
  return `A DNS record you created already exists for this hostname${atName}. Remove that manual record so Datum can program the ALB-managed one.`;
}

/**
 * Formats a DNS conflict error message into a user-friendly explanation
 *
 * Handles errors like:
 * - "RRset datum.net.test-import.com. IN CNAME: Conflicts with pre-existing RRset"
 * - "Record "datum.net": status 422: {"error": "RRset datum.net.test-import.com. IN CNAME: Conflicts with pre-existing RRset"}"
 * - Any error containing "Conflicts with pre-existing RRset"
 *
 * @param errorMessage - The raw error message from the API
 * @returns A user-friendly error message, or the original message if it's not a conflict error
 */
export function formatDnsConflictError(errorMessage: string): string {
  if (!errorMessage) {
    return errorMessage;
  }

  if (parseDnsRrsetConflict(errorMessage)) {
    return formatDnsRecordConflictError(errorMessage);
  }

  return errorMessage;
}

/**
 * Formats any DNS error message, applying appropriate transformations
 *
 * @param errorMessage - The raw error message from the API
 * @returns A formatted, user-friendly error message
 */
export function formatDnsError(errorMessage: string): string {
  if (!errorMessage) {
    return errorMessage;
  }

  if (parseDnsRrsetConflict(errorMessage)) {
    return formatDnsRecordConflictError(errorMessage);
  }

  const inner = unwrapDnsError(errorMessage);

  const lower = inner.toLowerCase();
  if (lower.includes('outside the zone') || lower.includes('not in zone')) {
    return 'The record name is outside the zone. Enter a relative name without the zone domain (for example, "www" instead of "www.example.com").';
  }

  return inner;
}
