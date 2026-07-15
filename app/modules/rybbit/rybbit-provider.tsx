import type { AnalyticsIdentity } from './analytics.types';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

const AnalyticsContext = createContext<AnalyticsIdentity | null>(null);

export function RybbitProvider({
  children,
  siteId,
  tag,
  nonce,
  identity,
}: {
  children: ReactNode;
  siteId: string;
  tag?: string;
  nonce?: string;
  identity: AnalyticsIdentity | null;
}) {
  useEffect(() => {
    if (typeof window === 'undefined' || !identity?.sub) return;
    window.rybbit?.identify(identity.sub);
  }, [identity?.sub]);

  return (
    <AnalyticsContext.Provider value={identity}>
      <script
        src="https://app.rybbit.io/api/script.js"
        data-site-id={siteId}
        data-tag={tag}
        nonce={nonce}
        defer
      />
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsIdentity() {
  return useContext(AnalyticsContext);
}
