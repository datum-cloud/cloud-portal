import { isProduction } from '@/utils/environment';
import { load, trackPageview } from 'fathom-client';
import { useEffect } from 'react';
import { useLocation } from 'react-router';

export const FathomAnalytics = ({ privateKey }: { privateKey: string }) => {
  const location = useLocation();

  useEffect(() => {
    if (isProduction() && privateKey) {
      load(privateKey);
    }
  }, [privateKey]);

  useEffect(() => {
    if (isProduction() && privateKey) {
      trackPageview();
    }
  }, [location.pathname, location.search, privateKey]);

  return null;
};
