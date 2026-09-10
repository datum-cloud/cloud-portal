/**
 * Condition type and reason constants for HTTPProxy status.
 * Aligns with network-services-operator PR: hostname and proxy status conditions for TLS cert health.
 * @see https://github.com/datum-cloud/network-services-operator/pull/115
 */

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

export type HostnameStatusLike = { hostname: string; conditions?: ConditionLike[] };

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

/** Human-readable certificate status for per-hostname CertificateReady */
export function getCertificateReadyDisplay(
  condition: ConditionLike | undefined
): 'ready' | 'pending' | 'failed' | 'challenge' | undefined {
  if (!condition) return undefined;
  if (condition.status === 'True' && condition.reason === CertificateReadyReason.CertificateIssued)
    return 'ready';
  if (condition.reason === CertificateReadyReason.ProvisioningFailed) return 'failed';
  if (condition.reason === CertificateReadyReason.ChallengeInProgress) return 'challenge';
  return 'pending';
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
