import { OtelProvider } from './providers/otel';
import { SentryProvider } from './providers/sentry';
import type { ObservabilityConfig, InitializationResult, ErrorDetectionResult } from './types';

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

const PROVIDER_REGISTRY = {
  sentry: SentryProvider,
  otel: OtelProvider,
} as const;

type ProviderName = keyof typeof PROVIDER_REGISTRY;
type ProviderInstance = InstanceType<(typeof PROVIDER_REGISTRY)[ProviderName]>;

// ============================================================================
// MAIN OBSERVABILITY MANAGER
// ============================================================================

export class ObservabilityManager {
  private readonly providers = new Map<ProviderName, ProviderInstance>();
  private errorHandlersInitialized = false;

  constructor(config: ObservabilityConfig = {}) {
    this.setupProviders(config);
    this.setupErrorHandlers(config);
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async initialize(): Promise<InitializationResult> {
    console.log('📊 Initializing observability services...');
    return await this.initializeAllProviders();
  }

  shutdown(): void {
    console.log('🛑 Shutting down observability services...');
    this.shutdownAllProviders();
  }

  getProviderStatus(): Record<string, { healthy: boolean; initialized: boolean }> {
    return this.getAllProviderStatus();
  }

  isObservabilityError(error: Error | any): ErrorDetectionResult {
    return this.detectObservabilityError(error);
  }

  // ============================================================================
  // STATIC METHODS
  // ============================================================================

  static getAvailableProviders(): ProviderName[] {
    return Object.keys(PROVIDER_REGISTRY) as ProviderName[];
  }

  static validateProviders(providerNames?: string[]): { valid: ProviderName[]; invalid: string[] } {
    if (!providerNames) {
      return { valid: this.getAvailableProviders(), invalid: [] };
    }

    const valid: ProviderName[] = [];
    const invalid: string[] = [];

    for (const name of providerNames) {
      if (name in PROVIDER_REGISTRY) {
        valid.push(name as ProviderName);
      } else {
        invalid.push(name);
      }
    }

    return { valid, invalid };
  }

  // ============================================================================
  // PRIVATE SETUP METHODS
  // ============================================================================

  private setupProviders(config: ObservabilityConfig): void {
    this.validateProviderConfig(config);
    this.createProviderInstances(config.providers as ProviderName[]);
  }

  private setupErrorHandlers(config: ObservabilityConfig): void {
    if (config.enableErrorHandling !== false) {
      this.initializeErrorHandlers();
    }
  }

  private validateProviderConfig(config: ObservabilityConfig): void {
    if (!config.providers) return;

    const { valid, invalid } = ObservabilityManager.validateProviders(config.providers);

    if (invalid.length > 0) {
      console.warn(`⚠️ Invalid providers ignored: ${invalid.join(', ')}`);
      console.log(
        `📊 Available providers: ${ObservabilityManager.getAvailableProviders().join(', ')}`
      );
    }

    if (valid.length === 0) {
      console.warn('⚠️ No valid providers configured, using all available providers');
    }
  }

  private createProviderInstances(providerNames?: ProviderName[]): void {
    const namesToInitialize = providerNames || ObservabilityManager.getAvailableProviders();

    for (const name of namesToInitialize) {
      if (name in PROVIDER_REGISTRY) {
        const ProviderClass = PROVIDER_REGISTRY[name];
        const provider = new ProviderClass();
        this.providers.set(name, provider);
      } else {
        console.warn(`⚠️ Unknown observability provider: ${name}`);
      }
    }
  }

  // ============================================================================
  // PROVIDER MANAGEMENT
  // ============================================================================

  private async initializeAllProviders(): Promise<InitializationResult> {
    const results: InitializationResult = {};
    const initPromises = this.createInitializationPromises();

    const initResults = await Promise.allSettled(initPromises);

    for (const result of initResults) {
      if (result.status === 'fulfilled') {
        const [name, success] = result.value;
        results[name] = success;
      }
    }

    return results;
  }

  private createInitializationPromises(): Promise<[ProviderName, boolean]>[] {
    return Array.from(this.providers.entries()).map(
      async ([name, provider]): Promise<[ProviderName, boolean]> => {
        try {
          console.log(`📊 Initializing ${provider.name}...`);
          const success = await provider.initialize();

          if (success) {
            console.log(`✅ ${provider.name} initialized successfully`);
          } else {
            console.warn(`⚠️ ${provider.name} initialization failed or was disabled`);
          }

          return [name, success];
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️ ${provider.name} initialization failed:`, errorMessage);
          return [name, false];
        }
      }
    );
  }

  private shutdownAllProviders(): void {
    for (const [name, provider] of this.providers) {
      try {
        provider.shutdown();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ Error shutting down ${name}:`, errorMessage);
      }
    }
  }

  private getAllProviderStatus(): Record<string, { healthy: boolean; initialized: boolean }> {
    const status: Record<string, { healthy: boolean; initialized: boolean }> = {};

    for (const [name, provider] of this.providers) {
      const providerStatus = provider.getStatus();
      status[name] = {
        healthy: providerStatus.healthy,
        initialized: providerStatus.initialized,
      };
    }

    return status;
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private detectObservabilityError(error: Error | any): ErrorDetectionResult {
    for (const [name, provider] of this.providers) {
      if (provider.isError(error)) {
        console.log(`🔍 Debug: Detected ${name} error:`, {
          message: error?.message || '',
          name: error?.name || '',
        });
        return {
          isObservabilityError: true,
          provider: name,
          errorType: this.getErrorType(name),
        };
      }
    }
    return { isObservabilityError: false };
  }

  private getErrorType(providerName: ProviderName): string {
    const errorTypes: Record<ProviderName, string> = {
      sentry: 'Sentry API/network issue',
      otel: 'gRPC/HTTP2 connection issue',
    };

    return errorTypes[providerName] || 'observability service issue';
  }

  private initializeErrorHandlers(): void {
    if (this.errorHandlersInitialized) return;

    this.setupGracefulShutdown();
    this.setupUncaughtExceptionHandler();
    this.setupUnhandledRejectionHandler();

    this.errorHandlersInitialized = true;
    console.log('✅ Observability error handlers initialized');
  }

  private setupGracefulShutdown(): void {
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down observability services...');
      this.shutdown();
      setTimeout(() => process.exit(0), 3000);
    });
  }

  private setupUncaughtExceptionHandler(): void {
    process.on('uncaughtException', (error) => {
      const { isObservabilityError, provider, errorType } = this.detectObservabilityError(error);

      if (isObservabilityError) {
        console.warn(`⚠️ Caught ${provider}-related error, continuing:`, error.message);
        console.warn(`📊 This is likely a ${errorType} that can be safely ignored`);
        return;
      }

      console.error('❌ Non-observability uncaught exception, re-throwing:', error.message);
      throw error;
    });
  }

  private setupUnhandledRejectionHandler(): void {
    process.on('unhandledRejection', (reason, promise) => {
      const { isObservabilityError, provider, errorType } = this.detectObservabilityError(reason);

      if (isObservabilityError) {
        const errorMessage = reason?.toString() || '';
        console.warn(`⚠️ Caught ${provider}-related promise rejection, continuing:`, errorMessage);
        console.warn(`📊 This is likely a ${errorType} that can be safely ignored`);
        return;
      }

      console.error('❌ Non-observability unhandled rejection at:', promise, 'reason:', reason);
    });
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let singletonManager: ObservabilityManager | null = null;
let initializationPromise: Promise<InitializationResult> | null = null;

// ============================================================================
// PUBLIC API
// ============================================================================

export function createObservabilityManager(config?: ObservabilityConfig): ObservabilityManager {
  return new ObservabilityManager(config);
}

export const initializeObservability = async (
  config?: ObservabilityConfig
): Promise<InitializationResult> => {
  if (initializationPromise) {
    console.log('📊 Observability initialization already in progress, waiting...');
    return await initializationPromise;
  }

  if (!singletonManager) {
    initializationPromise = (async () => {
      try {
        singletonManager = createObservabilityManager(config);
        return await singletonManager.initialize();
      } finally {
        initializationPromise = null;
      }
    })();
  }

  return await initializationPromise!;
};

export const shutdownObservability = (): void => {
  if (singletonManager) {
    singletonManager.shutdown();
    singletonManager = null;
  }
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { ObservabilityConfig, InitializationResult, ErrorDetectionResult, ProviderName };
