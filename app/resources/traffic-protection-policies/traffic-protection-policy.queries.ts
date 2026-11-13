import {
  createTrafficProtectionPolicyService,
  trafficProtectionPolicyKeys,
  type TrafficProtectionMaps,
  type TrafficProtectionView,
} from './traffic-protection-policy.service';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * WAF (TrafficProtectionPolicy) modes for a project, keyed by proxy name.
 * Gated by `enabled` so callers without view permission never trigger the request.
 */
export function useTrafficProtectionPolicies(
  projectId: string,
  options?: Omit<UseQueryOptions<TrafficProtectionMaps>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: trafficProtectionPolicyKeys.list(projectId),
    queryFn: () => createTrafficProtectionPolicyService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

/**
 * WAF (TrafficProtectionPolicy) view for a single proxy. Gated by `enabled` so
 * callers without view permission never trigger the request.
 */
export function useTrafficProtectionPolicy(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<TrafficProtectionView | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: trafficProtectionPolicyKeys.detail(projectId, name),
    queryFn: () => createTrafficProtectionPolicyService().getForProxy(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}
