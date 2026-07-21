import type { AnalyticsActionName, AnalyticsOverrides } from './analytics.types';
import { buildEventName } from './build-event-name';
import { useAnalyticsIdentity } from './fathom-provider';
import { trackEvent } from 'fathom-client';
import { useCallback } from 'react';

export function useAnalytics() {
  const identity = useAnalyticsIdentity();

  const trackAction = useCallback(
    (action: AnalyticsActionName, overrides?: AnalyticsOverrides) => {
      const sub = identity?.sub;
      if (!sub) return;

      const orgId = overrides?.orgId ?? identity.orgId;
      const projectId = overrides?.projectId ?? identity.projectId;

      const eventName = buildEventName(action, sub, orgId, projectId);
      trackEvent(eventName);
    },
    [identity]
  );

  return { trackAction };
}
