import type { AnalyticsIdentity } from './analytics.types';
import { load, trackPageview } from 'fathom-client';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';

const AnalyticsContext = createContext<AnalyticsIdentity | null>(null);

export function FathomProvider({
  children,
  siteId,
  identity,
}: {
  children: ReactNode;
  siteId: string;
  identity: AnalyticsIdentity | null;
}) {
  const location = useLocation();

  useEffect(() => {
    load(siteId);
  }, [siteId]);

  useEffect(() => {
    trackPageview();
  }, [location.pathname, location.search]);

  return <AnalyticsContext.Provider value={identity}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsIdentity() {
  return useContext(AnalyticsContext);
}
