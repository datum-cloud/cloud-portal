import { load, trackPageview } from 'fathom-client';
import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Fathom Analytics component
 * Note: This component is only rendered in production when FATHOM_ID is set
 * (see root.tsx conditional rendering)
 */
export const FathomAnalytics = ({ privateKey }: { privateKey: string }) => {
  const location = useLocation();

  useEffect(() => {
    if (privateKey) {
      load(privateKey);
    }
  }, [privateKey]);

  useEffect(() => {
    if (privateKey) {
      trackPageview();
    }
  }, [location.pathname, location.search, privateKey]);

  return null;
};
