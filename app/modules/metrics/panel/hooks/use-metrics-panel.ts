import { MetricsPanelContext, MetricsPanelContextType } from '../metrics-panel-context';
import { useContext } from 'react';

/**
 * Main hook for accessing the MetricsPanel context
 */
export function useMetricsPanel(): MetricsPanelContextType {
  const context = useContext(MetricsPanelContext);

  if (!context) {
    throw new Error('useMetricsPanel must be used within a MetricsPanelProvider');
  }

  return context;
}
