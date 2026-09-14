import {
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
  getDnsRecordProgrammedCondition,
  isHostnameDnsInFlight,
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

  if (transformControlPlaneStatus(proxy.status).status === ControlPlaneStatus.Pending) {
    return true;
  }

  if (getCertificatesReadyDisplay(getCertificatesReadyCondition(proxy.status)) === 'pending') {
    return true;
  }

  const expected = proxy.hostnames ?? [];
  const statuses = proxy.hostnameStatuses ?? [];
  if (expected.length > 0 && statuses.length < expected.length) return true;

  return statuses.some((hostnameStatus) => {
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
