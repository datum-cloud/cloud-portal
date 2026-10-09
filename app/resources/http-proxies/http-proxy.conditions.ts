/**
 * Condition type and reason constants for HTTPProxy status.
 * Aligns with network-services-operator PR: hostname and proxy status conditions for TLS cert health.
 * @see https://github.com/datum-cloud/network-services-operator/pull/115
 */
import { ControlPlaneStatus, type IExtendedControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import {
  formatAlbHostnameDnsConflict,
  formatDnsError,
  parseDnsRrsetConflict,
} from '@/utils/helpers/dns/error-formatting.helper';

/** HTTPProxy-level condition: true when all HTTPS hostnames have ready TLS certificates */
export const HTTP_PROXY_CONDITION_CERTIFICATES_READY = 'CertificatesReady';

export const CertificatesReadyReason = {
  AllCertificatesReady: 'AllCertificatesReady',
  CertificatesPending: 'CertificatesPending',
  CertificatesFailed: 'CertificatesFailed',
} as const;

export type CertificatesReadyReasonType =
  (typeof CertificatesReadyReason)[keyof typeof CertificatesReadyReason];

/** Per-hostname condition: whether a TLS certificate has been provisioned for this hostname */
export const HOSTNAME_CONDITION_CERTIFICATE_READY = 'CertificateReady';

export const CertificateReadyReason = {
  CertificateIssued: 'CertificateIssued',
  Pending: 'Pending',
  ProvisioningFailed: 'ProvisioningFailed',
  ChallengeInProgress: 'ChallengeInProgress',
  /** Still serving a valid certificate, but its replacement can't be issued */
  RenewalFailing: 'RenewalFailing',
  /** Wildcard hostname in a project Datum hasn't enabled for wildcards; terminal until staff grant it */
  WildcardNotEntitled: 'WildcardNotEntitled',
} as const;

export type CertificateReadyReasonType =
  (typeof CertificateReadyReason)[keyof typeof CertificateReadyReason];

export type ConditionLike = {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason: string;
  message: string;
};

export type HttpProxyStatusLike = { conditions?: ConditionLike[] };

/** Accepted=False reasons that no amount of waiting will fix; the user has to edit the proxy. */
const HTTP_PROXY_TERMINAL_ACCEPTED_REASONS = new Set(['Invalid', 'DerivedResourceInvalid']);

/** The operator's Programmed message while it retries an internal error. */
const HTTP_PROXY_RETRY_REF = /internal error and will be retried \(ref: ([0-9a-f]{8})\)/;

export type HttpProxyStatus = IExtendedControlPlaneStatus & {
  /** Support reference while the operator retries after an internal error. */
  retryRef?: string;
};

/**
 * Proxy-aware status: an Accepted rejection the user must fix is Error rather
 * than Pending, and an internal-error retry keeps Pending with its reference.
 */
export function getHttpProxyStatus(status?: HttpProxyStatusLike | null): HttpProxyStatus {
  const base = transformControlPlaneStatus(status);
  const conditions = status?.conditions ?? [];

  const accepted = conditions.find((condition) => condition.type === 'Accepted');
  if (accepted?.status === 'False' && HTTP_PROXY_TERMINAL_ACCEPTED_REASONS.has(accepted.reason)) {
    return { ...base, status: ControlPlaneStatus.Error, message: accepted.message };
  }

  if (base.status !== ControlPlaneStatus.Pending) return base;

  const programmed = conditions.find((condition) => condition.type === 'Programmed');
  const retryRef = programmed?.message?.match(HTTP_PROXY_RETRY_REF)?.[1];
  return retryRef ? { ...base, retryRef } : base;
}

export type HostnameDnsRecordLike = {
  name: string;
  type: string;
  content: string;
  purpose: string;
  managedBy: string;
  state: string;
};

export type HostnameStatusLike = {
  hostname: string;
  conditions?: ConditionLike[];
  dnsRecords?: HostnameDnsRecordLike[];
};

/**
 * Get the CertificatesReady condition from HTTPProxy status.
 * Present when the proxy has HTTPS listeners; indicates aggregate cert health.
 */
export function getCertificatesReadyCondition(
  status: HttpProxyStatusLike | null | undefined
): ConditionLike | undefined {
  return status?.conditions?.find((c) => c.type === HTTP_PROXY_CONDITION_CERTIFICATES_READY);
}

/**
 * Get the CertificateReady condition from a hostname status entry.
 * Indicates whether TLS has been provisioned for that hostname.
 */
export function getCertificateReadyCondition(
  hostnameStatus: HostnameStatusLike | null | undefined
): ConditionLike | undefined {
  return hostnameStatus?.conditions?.find((c) => c.type === HOSTNAME_CONDITION_CERTIFICATE_READY);
}

/** Human-readable certificate status for proxy-level CertificatesReady */
export function getCertificatesReadyDisplay(
  condition: ConditionLike | undefined
): 'ready' | 'pending' | 'failed' | undefined {
  if (!condition) return undefined;
  if (
    condition.status === 'True' &&
    condition.reason === CertificatesReadyReason.AllCertificatesReady
  )
    return 'ready';
  if (condition.reason === CertificatesReadyReason.CertificatesFailed) return 'failed';
  return 'pending';
}

/**
 * Human-readable certificate status for per-hostname CertificateReady.
 *
 * - `renewal-failing` — still serving a valid certificate; the next one can't be issued.
 * - `not-enabled` — a wildcard in a project without wildcard access; no certificate is issued.
 */
export function getCertificateReadyDisplay(
  condition: ConditionLike | undefined
): 'ready' | 'renewal-failing' | 'pending' | 'failed' | 'challenge' | 'not-enabled' | undefined {
  if (!condition) return undefined;
  if (condition.reason === CertificateReadyReason.WildcardNotEntitled) return 'not-enabled';
  if (condition.status === 'True') {
    return condition.reason === CertificateReadyReason.RenewalFailing ? 'renewal-failing' : 'ready';
  }
  if (condition.reason === CertificateReadyReason.ProvisioningFailed) return 'failed';
  if (condition.reason === CertificateReadyReason.ChallengeInProgress) return 'challenge';
  return 'pending';
}

/** Shown when a wildcard is refused because the project isn't enabled for wildcards. */
export const WILDCARD_NOT_ENABLED_MESSAGE =
  'Wildcard hostnames are not enabled for this project, so no certificate is issued. Contact Datum to enable them, or use an exact hostname.';

/** Per-hostname condition: whether the hostname was claimed by this ALB or is held by another resource */
export const HOSTNAME_CONDITION_AVAILABLE = 'Available';

/** Per-hostname condition: whether a verified Domain proves ownership of this hostname */
export const HOSTNAME_CONDITION_VERIFIED = 'Verified';

export const HostnameVerifiedReason = {
  Verified: 'Verified',
  PendingVerification: 'PendingVerification',
  /** A wildcard whose base (or a parent) isn't verified by DNS TXT record */
  DNSVerificationRequired: 'DNSVerificationRequired',
  WildcardNotSupported: 'WildcardNotSupported',
} as const;

export type HostnameOwnershipDisplay = {
  state: 'verified' | 'verifying' | 'unverified' | 'in-use' | 'dns-proof-required';
  label: string;
  message?: string;
};

/**
 * Ownership state for a hostname, from its Available (claim) and Verified
 * (domain proof) conditions. The operator only sets Available once a hostname
 * passes verification, so a refused hostname carries Verified=False alone.
 */
export function getHostnameOwnershipDisplay(
  hostnameStatus: HostnameStatusLike | null | undefined
): HostnameOwnershipDisplay {
  const conditions = hostnameStatus?.conditions ?? [];
  const available = conditions.find((c) => c.type === HOSTNAME_CONDITION_AVAILABLE);
  const verified = conditions.find((c) => c.type === HOSTNAME_CONDITION_VERIFIED);

  if (available?.status === 'True') return { state: 'verified', label: 'Verified' };
  if (available?.status === 'False') {
    return {
      state: 'in-use',
      label: 'In use',
      message: available.message || 'Another resource already uses this hostname.',
    };
  }

  if (verified?.status === 'False') {
    switch (verified.reason) {
      case HostnameVerifiedReason.DNSVerificationRequired:
        return {
          state: 'dns-proof-required',
          label: 'Needs DNS proof',
          message:
            verified.message ||
            'This wildcard needs its domain, or a parent of it, verified by DNS TXT record.',
        };
      case HostnameVerifiedReason.WildcardNotSupported:
        return {
          state: 'unverified',
          label: 'Wildcard unavailable',
          message: verified.message || 'Wildcard hostnames are not available on this platform.',
        };
      default:
        // PendingVerification: the Domain may still be mid-check, so this isn't an error yet.
        return { state: 'verifying', label: 'Verifying', message: verified.message };
    }
  }

  return { state: 'verifying', label: 'Verifying' };
}

/**
 * True when ownership stops the hostname going any further: DNS isn't
 * programmed and no certificate is ordered until the user fixes it.
 */
export function isHostnameOwnershipBlocked(ownership: HostnameOwnershipDisplay): boolean {
  return ownership.state !== 'verified' && ownership.state !== 'verifying';
}

/**
 * True when the certificate is waiting on a Certificate (DNS-01 delegation)
 * record the user hasn't published yet. Nothing moves until they add it, so
 * this reads as "awaiting DNS" rather than a spinner.
 */
export function isCertificateAwaitingDnsRecord(
  hostnameStatus: HostnameStatusLike | null | undefined
): boolean {
  const cert = getCertificateReadyDisplay(getCertificateReadyCondition(hostnameStatus));
  return (
    (cert === 'pending' || cert === 'challenge') &&
    getRecordsToPublish(hostnameStatus).some((record) => record.purpose === 'Certificate')
  );
}

/**
 * Custom hostnames waiting on the user rather than on Datum: ownership was
 * refused, the project isn't enabled for wildcards, or the certificate needs
 * a record the user hasn't published. The ALB-level Programmed and
 * CertificatesReady conditions stay pending behind these, so summaries should
 * name them instead of showing a spinner.
 */
export function getBlockedHostnames(proxy: {
  hostnames?: string[];
  hostnameStatuses?: HostnameStatusLike[];
}): { wildcardsNotEnabled: string[]; ownershipBlocked: string[]; awaitingDns: string[] } {
  const wildcardsNotEnabled: string[] = [];
  const ownershipBlocked: string[] = [];
  const awaitingDns: string[] = [];
  for (const hostname of proxy.hostnames ?? []) {
    const status = proxy.hostnameStatuses?.find((entry) => entry.hostname === hostname);
    if (isHostnameOwnershipBlocked(getHostnameOwnershipDisplay(status))) {
      ownershipBlocked.push(hostname);
    } else if (getCertificateReadyDisplay(getCertificateReadyCondition(status)) === 'not-enabled') {
      wildcardsNotEnabled.push(hostname);
    } else if (isCertificateAwaitingDnsRecord(status)) {
      awaitingDns.push(hostname);
    }
  }
  return { wildcardsNotEnabled, ownershipBlocked, awaitingDns };
}

/**
 * True when the ALB is accepted and the only things keeping it "not
 * programmed" are custom hostnames waiting on the user. Programmed mirrors the
 * Gateway, which gives one verdict for all listeners, so in this state the
 * default hostname is serving and nothing will move until the user acts.
 */
export function isHeldBackByCustomHostnames(proxy: {
  status?: HttpProxyStatusLike | null;
  hostnames?: string[];
  hostnameStatuses?: HostnameStatusLike[];
}): boolean {
  const accepted = proxy.status?.conditions?.find((c) => c.type === 'Accepted');
  if (accepted?.status !== 'True') return false;
  const { wildcardsNotEnabled, ownershipBlocked, awaitingDns } = getBlockedHostnames(proxy);
  return wildcardsNotEnabled.length + ownershipBlocked.length + awaitingDns.length > 0;
}

/**
 * DNS records the user publishes for a hostname, in the order the operator
 * lists them. Platform-managed records are excluded: Datum writes those itself.
 *
 * Pass `inDatumZone` when the hostname sits in one of the project's Datum DNS
 * zones. The operator only marks the routing record as platform-managed once
 * it has written it, which waits for the hostname to be admitted; until then
 * it reads as the user's job, and a hand-made copy would later clash with the
 * one the ALB writes.
 */
export function getUserDnsRecords(
  hostnameStatus: HostnameStatusLike | null | undefined,
  { inDatumZone = false }: { inDatumZone?: boolean } = {}
): HostnameDnsRecordLike[] {
  return (hostnameStatus?.dnsRecords ?? []).filter(
    (record) => record.managedBy === 'User' && !(inDatumZone && record.purpose === 'Routing')
  );
}

/**
 * Missing user records that block something. Once the certificate is issued, a
 * missing Certificate record only matters for renewal, so it isn't counted.
 */
export function getActionableRecordsToPublish(
  hostnameStatus: HostnameStatusLike | null | undefined,
  options?: { inDatumZone?: boolean }
): HostnameDnsRecordLike[] {
  const cert = getCertificateReadyDisplay(getCertificateReadyCondition(hostnameStatus));
  const issued = cert === 'ready' || cert === 'renewal-failing';
  return getRecordsToPublish(hostnameStatus, options).filter(
    (record) => !(issued && record.purpose === 'Certificate')
  );
}

/** User-published records that aren't in effect on the Internet yet. */
export function getRecordsToPublish(
  hostnameStatus: HostnameStatusLike | null | undefined,
  options?: { inDatumZone?: boolean }
): HostnameDnsRecordLike[] {
  return getUserDnsRecords(hostnameStatus, options).filter((record) => record.state === 'Missing');
}

/** Per-hostname condition: whether Datum DNS has programmed a record for this hostname */
export const HOSTNAME_CONDITION_DNS_RECORD_PROGRAMMED = 'DNSRecordProgrammed';

export const DnsRecordProgrammedReason = {
  /** Hostname is not served by a Datum DNS zone, so no record is ever created for it */
  NotApplicable: 'NotApplicable',
  DomainNotVerified: 'DomainNotVerified',
  DNSAuthorityMissing: 'DNSAuthorityMissing',
  /** A record for this hostname already exists and is managed by something else */
  Conflict: 'Conflict',
  Failed: 'Failed',
} as const;

export type DnsRecordProgrammedReasonType =
  (typeof DnsRecordProgrammedReason)[keyof typeof DnsRecordProgrammedReason];

/**
 * Get the DNSRecordProgrammed condition from a hostname status entry.
 * Indicates whether Datum created a DNS record for that hostname.
 */
export function getDnsRecordProgrammedCondition(
  hostnameStatus: HostnameStatusLike | null | undefined
): ConditionLike | undefined {
  return hostnameStatus?.conditions?.find(
    (c) => c.type === HOSTNAME_CONDITION_DNS_RECORD_PROGRAMMED
  );
}

/**
 * Whether a Datum-managed DNS record currently exists for a hostname.
 *
 * - `programmed` — a record exists; deleting the ALB removes it.
 * - `not-applicable` — the hostname is not in a Datum DNS zone, so none was created.
 * - `pending` — not verified, conflicted, or failed; no record has been created yet.
 */
export function getDnsRecordProgrammedDisplay(
  condition: ConditionLike | undefined
): 'programmed' | 'not-applicable' | 'pending' {
  if (condition?.status === 'True') return 'programmed';
  if (condition?.reason === DnsRecordProgrammedReason.NotApplicable) return 'not-applicable';
  return 'pending';
}

/**
 * True while DNS for this hostname can still change without the user editing
 * the ALB (still verifying, record being written). False for terminal states
 * that only move after a user action (conflict, failed, not delegated).
 */
export function isHostnameDnsInFlight(condition: ConditionLike | undefined): boolean {
  if (!condition) return true;
  if (condition.status === 'True') return false;
  switch (condition.reason) {
    case DnsRecordProgrammedReason.NotApplicable:
    case DnsRecordProgrammedReason.Conflict:
    case DnsRecordProgrammedReason.Failed:
    case DnsRecordProgrammedReason.DNSAuthorityMissing:
    case DnsRecordProgrammedReason.DomainNotVerified:
      return false;
    default:
      return true;
  }
}

/**
 * A DNSRecordProgrammed problem the user has to act on, as opposed to a state
 * that resolves on its own (still verifying, record being written).
 *
 * Returns a short label and an explanation suitable for a tooltip, or
 * undefined when the hostname is fine or merely pending.
 */
export function getDnsRecordProgrammedIssue(
  condition: ConditionLike | undefined
): { label: string; message: string } | undefined {
  if (!condition || condition.status === 'True') return undefined;

  const rrsetConflict = parseDnsRrsetConflict(condition.message ?? '');
  if (condition.reason === DnsRecordProgrammedReason.Conflict || rrsetConflict) {
    return {
      label: 'DNS conflict',
      message: formatAlbHostnameDnsConflict(condition.message),
    };
  }

  switch (condition.reason) {
    case DnsRecordProgrammedReason.DNSAuthorityMissing:
      return {
        label: 'DNS not delegated',
        message:
          condition.message ||
          "The DNS zone for this hostname isn't delegated to Datum yet. Point the domain's nameservers at Datum to let it program records.",
      };
    case DnsRecordProgrammedReason.Failed:
      return {
        label: 'DNS failed',
        message: formatDnsError(
          condition.message || 'Datum could not program the DNS record for this hostname.'
        ),
      };
    default:
      return undefined;
  }
}
