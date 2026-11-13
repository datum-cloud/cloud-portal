import {
  trafficProtectionPolicyKeys,
  type TrafficProtectionView,
} from './traffic-protection-policy.service';
import type { ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy } from '@/modules/control-plane/networking';
import { useResourceWatch } from '@/modules/watch';
import {
  getParanoiaLevels,
  getRuleExclusions,
  getTrafficProtectionMode,
} from '@/resources/http-proxies/http-proxy.adapter';
import {
  getTrafficProtectionProgrammedMessage,
  getTrafficProtectionProgrammedReason,
  isTrafficProtectionProgrammed,
  mergeTrafficProtectionView,
} from '@/resources/http-proxies/http-proxy.waf-status';

function toTrafficProtectionView(
  raw: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy
): TrafficProtectionView {
  const view: TrafficProtectionView = {
    mode: getTrafficProtectionMode(raw),
    paranoiaLevels: getParanoiaLevels(raw),
    ruleExclusions: getRuleExclusions(raw),
    policyName: raw.metadata?.name,
  };
  if (raw.status?.ancestors !== undefined) {
    view.programmed = isTrafficProtectionProgrammed(raw.status);
    view.programmedMessage = getTrafficProtectionProgrammedMessage(raw.status);
    view.programmedReason = getTrafficProtectionProgrammedReason(raw.status);
  }
  return view;
}

/**
 * Watch a proxy's TrafficProtectionPolicy for live mode/Programmed updates.
 * Updates the permission-gated WAF detail query cache (same key as
 * useTrafficProtectionPolicy). `policyName` is the actual TPP object name when
 * it differs from the proxy (e.g. `{proxy}-protection`).
 */
export function useTrafficProtectionPolicyWatch(
  projectId: string,
  proxyName: string,
  options?: { enabled?: boolean; policyName?: string }
) {
  const queryKey = trafficProtectionPolicyKeys.detail(projectId, proxyName);
  const watchName = options?.policyName || proxyName;

  useResourceWatch<TrafficProtectionView>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/trafficprotectionpolicies',
    projectId,
    namespace: 'default',
    name: watchName,
    queryKey,
    transform: (item) =>
      toTrafficProtectionView(item as ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy),
    enabled: (options?.enabled ?? true) && !!projectId && !!watchName,
    updateSingleCache: (oldData, newItem) => mergeTrafficProtectionView(oldData, newItem),
  });
}
