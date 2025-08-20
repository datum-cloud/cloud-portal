import type { MetricsContextType } from './metrics-context';
import { createContext, useContext } from 'react';

/**
 * Context for the metrics dashboard controls
 */
export const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

/**
 * Hook to access the metrics context
 */
export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};
