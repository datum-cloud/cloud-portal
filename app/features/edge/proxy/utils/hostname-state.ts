import type { ZoneRecords } from '@/features/edge/proxy/utils/delete-dns-preview';
import { resolveHostnameDnsIssue } from '@/features/edge/proxy/utils/hostname-dns-issue';
import {
  type HostnameDnsRecordLike,
  type HostnameOwnershipDisplay,
  type HostnameStatusLike,
  getActionableRecordsToPublish,
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  getDnsRecordProgrammedCondition,
  getDnsRecordProgrammedDisplay,
  getHostnameOwnershipDisplay,
  getUserDnsRecords,
  getUserRoutingRecord,
  isCertificateAwaitingDnsRecord,
  isHostnameOwnershipBlocked,
} from '@/resources/http-proxies';

/**
 * Everything the ALB UI shows about one custom hostname, derived once so every
 * card reads the same states in the same order.
 */
export type HostnameState = {
  hostname: string;
  ownership: HostnameOwnershipDisplay;
  /** Ownership stops DNS and the certificate until the user fixes it. */
  blocked: boolean;
  dns: ReturnType<typeof getDnsRecordProgrammedDisplay>;
  dnsMessage?: string;
  /** Set when Datum can't program the record until the user fixes something. */
  dnsIssue?: { label: string; message: string };
  /** The record pointing the hostname at the ALB, when the user runs its DNS outside Datum. */
  externalRouting?: HostnameDnsRecordLike;
  cert: ReturnType<typeof getCertificateReadyDisplay>;
  certMessage?: string;
  /** The certificate is serving, so a missing Certificate record only matters for renewal. */
  certificateIssued: boolean;
  /** The certificate is waiting on a Certificate record the user hasn't published. */
  awaitingCertRecord: boolean;
  /** Records the user publishes for this hostname (routing left to Datum in a Datum zone). */
  userRecords: HostnameDnsRecordLike[];
  /** Missing records that block something, i.e. not renewal-only. */
  actionableRecords: HostnameDnsRecordLike[];
};

export function buildHostnameState({
  hostname,
  hostnameStatus,
  inDatumZone,
  zonesLoaded,
  proxyName,
  zoneRecords,
}: {
  hostname: string;
  hostnameStatus: HostnameStatusLike | undefined;
  /** The hostname sits in one of the project's Datum DNS zones that serves it. */
  inDatumZone: boolean;
  /** The project's DNS zones have loaded, so a hostname outside them is known to be external. */
  zonesLoaded: boolean;
  proxyName?: string;
  zoneRecords: ZoneRecords[];
}): HostnameState {
  const dnsCondition = getDnsRecordProgrammedCondition(hostnameStatus);
  const certCondition = getCertificateReadyCondition(hostnameStatus);
  // The operator only reports DNS for a hostname once Datum writes a record for
  // it (network-services-operator#489), so one whose DNS runs elsewhere has no
  // condition. Outside every Datum zone, that means external, not pending.
  const dns: HostnameState['dns'] =
    !dnsCondition && zonesLoaded && !inDatumZone
      ? 'not-applicable'
      : getDnsRecordProgrammedDisplay(dnsCondition);
  const cert = getCertificateReadyDisplay(certCondition);
  const ownership = getHostnameOwnershipDisplay(hostnameStatus);

  return {
    hostname,
    ownership,
    blocked: isHostnameOwnershipBlocked(ownership),
    dns,
    dnsMessage: dnsCondition?.message,
    dnsIssue: resolveHostnameDnsIssue({
      hostname,
      dns,
      condition: dnsCondition,
      proxyName,
      zoneRecords,
    }),
    externalRouting: dns === 'not-applicable' ? getUserRoutingRecord(hostnameStatus) : undefined,
    cert,
    certMessage: certCondition?.message,
    certificateIssued: cert === 'ready' || cert === 'renewal-failing',
    awaitingCertRecord: isCertificateAwaitingDnsRecord(hostnameStatus),
    userRecords: getUserDnsRecords(hostnameStatus, { inDatumZone }),
    actionableRecords: getActionableRecordsToPublish(hostnameStatus, { inDatumZone }),
  };
}
