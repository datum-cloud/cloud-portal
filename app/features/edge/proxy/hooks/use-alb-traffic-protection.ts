import { usePermission } from '@/modules/rbac';
import { type HttpProxy } from '@/resources/http-proxies';
import {
  useTrafficProtectionPolicy,
  useTrafficProtectionPolicyWatch,
} from '@/resources/traffic-protection-policies';
import { useMemo } from 'react';

export function useAlbTrafficProtection(projectId: string, proxyId: string, proxy?: HttpProxy) {
  const { hasPermission: canViewWaf, isLoading: wafPermLoading } = usePermission(
    'trafficprotectionpolicies',
    'get',
    {
      group: 'networking.datumapis.com',
      namespace: 'default',
      scope: 'project',
      staleTime: 0,
      refetchOnMount: 'always',
    }
  );

  const {
    data: waf,
    isError: wafError,
    isLoading: wafDataLoading,
  } = useTrafficProtectionPolicy(projectId, proxyId, {
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: canViewWaf,
    retry: false,
  });

  useTrafficProtectionPolicyWatch(projectId, proxyId, {
    enabled: canViewWaf,
    policyName: waf?.policyName,
  });

  const wafPending = wafPermLoading || (canViewWaf && waf === undefined && wafDataLoading);

  const effectiveProxy = useMemo<HttpProxy | undefined>(
    () =>
      proxy
        ? {
            ...proxy,
            trafficProtectionMode: waf?.mode,
            paranoiaLevels: waf?.paranoiaLevels,
            ruleExclusions: waf?.ruleExclusions,
          }
        : proxy,
    [proxy, waf]
  );

  const wafEnabled =
    !!effectiveProxy?.trafficProtectionMode && effectiveProxy.trafficProtectionMode !== 'Disabled';

  return {
    canViewWaf: canViewWaf && !waf?.forbidden,
    wafUnavailable: wafError,
    wafPending,
    wafProgrammed: waf?.programmed,
    wafProgrammedMessage: waf?.programmedMessage,
    wafProgrammedReason: waf?.programmedReason,
    wafEnabled,
    effectiveProxy,
    trafficProtectionMode: effectiveProxy?.trafficProtectionMode,
  };
}
