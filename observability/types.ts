// Base provider interface that all observability providers must implement
export interface ObservabilityProvider {
  name: string;
  initialize: () => Promise<boolean>;
  shutdown: () => void;
  isError: (error: Error | any) => boolean;
}

// Configuration for the observability manager
export interface ObservabilityConfig {
  providers?: string[]; // List of provider names to initialize
  enableErrorHandling?: boolean; // Whether to set up process error handlers
}

// Result of initialization
export interface InitializationResult {
  [providerName: string]: boolean;
}

// Error detection result
export interface ErrorDetectionResult {
  isObservabilityError: boolean;
  provider?: string;
  errorType?: string;
}
