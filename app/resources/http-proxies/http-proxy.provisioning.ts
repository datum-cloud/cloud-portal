import {
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
  getDnsRecordProgrammedCondition,
  getBlockedHostnames,
  getHostnameOwnershipDisplay,
  isHeldBackByCustomHostnames,
  isHostnameDnsInFlight,
  isHostnameOwnershipBlocked,
} from './http-proxy.conditions';
import type { HttpProxy } from './http-proxy.schema';
import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

/** How often to re-GET an HTTPProxy while certificates/DNS/programming are still in flight. */
export const HTTP_PROXY_PROVISIONING_POLL_MS = 4000;

/**
 * True while the health strip (or hostname rows) can still change without a
 * user edit. Used as a refetch backstop when the watch stream is quiet.
 */
export function isHttpProxyProvisioning(proxy?: HttpProxy): boolean {
  if (!proxy) return false;

  // A blocked hostname keeps Programmed and CertificatesReady pending for the
  // whole ALB until the user acts, so once the ALB is accepted those two say
  // nothing about progress; judge the other hostnames one by one instead.
  const heldBack = isHeldBackByCustomHostnames(proxy);

  if (!heldBack) {
    if (transformControlPlaneStatus(proxy.status).status === ControlPlaneStatus.Pending) {
      return true;
    }
    if (getCertificatesReadyDisplay(getCertificatesReadyCondition(proxy.status)) === 'pending') {
      return true;
    }
  }

  const blocked = getBlockedHostnames(proxy);
  const expected = proxy.hostnames ?? [];
  const statuses = proxy.hostnameStatuses ?? [];
  if (expected.length > 0 && statuses.length < expected.length) return true;

  return statuses.some((hostnameStatus) => {
    // DNS and the certificate stay pending until the user fixes ownership.
    if (isHostnameOwnershipBlocked(getHostnameOwnershipDisplay(hostnameStatus))) return false;
    if (blocked.wildcardsNotEnabled.includes(hostnameStatus.hostname)) return false;
    // The certificate waits on a record the user publishes; the watch stream
    // brings the change in, so there's nothing to poll for meanwhile.
    if (blocked.awaitingDns.includes(hostnameStatus.hostname)) return false;
    if (isHostnameDnsInFlight(getDnsRecordProgrammedCondition(hostnameStatus))) {
      return true;
    }
    const cert = getCertificateReadyDisplay(getCertificateReadyCondition(hostnameStatus));
    if (cert === 'pending' || cert === 'challenge') return true;
    const available = hostnameStatus.conditions?.find(
      (condition) => condition.type === 'Available'
    );
    // Unknown is still verifying; False is a user-action failure.
    return available?.status === 'Unknown';
  });
}
