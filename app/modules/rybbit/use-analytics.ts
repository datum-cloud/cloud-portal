import type { AnalyticsActionName, AnalyticsOverrides } from './analytics.types';
import { useAnalyticsIdentity } from './rybbit-provider';
import { useCallback } from 'react';

export function useAnalytics() {
  const identity = useAnalyticsIdentity();

  const trackAction = useCallback(
    (action: AnalyticsActionName, overrides?: AnalyticsOverrides) => {
      const sub = identity?.sub;
      if (!sub) return;

      const orgId = overrides?.orgId ?? identity.orgId;
      const projectId = overrides?.projectId ?? identity.projectId;

      if (typeof window === 'undefined') return;
      window.rybbit?.event(action, { sub, orgId, projectId });
    },
    [identity]
  );

  return { trackAction };
}
