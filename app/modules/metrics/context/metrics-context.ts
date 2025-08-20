/**
 * Interface for the MetricsContext
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MetricsContextType {
  // Time range state
  range: string;
  setRange: (value: string) => void;
  timeRange: TimeRange;

  // Step state
  step: string;
  setStep: (value: string) => void;

  // Refresh state
  refreshInterval: string;
  setRefreshInterval: (value: string) => void;
  lastRefreshed: Date | null;
  refetch: () => void;
}
