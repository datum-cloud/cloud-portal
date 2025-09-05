import type { ObservabilityProvider } from '../types';

// Abstract base class for all observability providers
export abstract class BaseProvider implements ObservabilityProvider {
  abstract name: string;

  // Factory method for creating provider instances
  static createProvider<T extends BaseProvider>(this: new (...args: any[]) => T, config?: any): T {
    return new this(config);
  }

  // Abstract methods that must be implemented by each provider
  abstract initialize(): Promise<boolean>;
  abstract shutdown(): void;
  abstract isError(error: Error | any): boolean;

  // Lifecycle hooks for extensibility
  protected async onBeforeInitialize?(): Promise<void>;
  protected async onAfterInitialize?(): Promise<void>;
  protected async onBeforeShutdown?(): Promise<void>;
  protected async onAfterShutdown?(): Promise<void>;

  // Helper method to extract error text for pattern matching
  protected extractErrorText(error: Error | any): string[] {
    const errorMessage = (error?.message || '').toLowerCase();
    const errorStack = (error?.stack || '').toLowerCase();
    const errorString = String(error || '').toLowerCase();

    return [errorMessage, errorStack, errorString];
  }

  // Helper method to check if error matches any patterns
  protected matchesPatterns(error: Error | any, patterns: string[]): boolean {
    const errorTexts = this.extractErrorText(error);
    return patterns.some((pattern) => errorTexts.some((text) => text.includes(pattern)));
  }

  // Helper method for safe initialization with lifecycle hooks
  protected async safeInitialize(initFn: () => Promise<boolean>): Promise<boolean> {
    try {
      // Call before initialization hook
      if (this.onBeforeInitialize) {
        await this.onBeforeInitialize();
      }

      const result = await initFn();

      // Call after initialization hook
      if (this.onAfterInitialize) {
        await this.onAfterInitialize();
      }

      return result;
    } catch (error) {
      console.error(`❌ Error initializing ${this.name}:`, error);
      if (error instanceof Error) {
        console.error(`❌ Error details:`, error.message);
        console.error(`❌ Error stack:`, error.stack);
      }
      console.warn(`⚠️ Continuing without ${this.name} due to initialization error`);
      return false;
    }
  }

  // Helper method for safe shutdown with lifecycle hooks
  protected safeShutdown(shutdownFn: () => void): void {
    try {
      // Call before shutdown hook
      if (this.onBeforeShutdown) {
        this.onBeforeShutdown().catch((error) => {
          console.warn(`⚠️ Error in ${this.name} beforeShutdown hook:`, error);
        });
      }

      shutdownFn();

      // Call after shutdown hook
      if (this.onAfterShutdown) {
        this.onAfterShutdown().catch((error) => {
          console.warn(`⚠️ Error in ${this.name} afterShutdown hook:`, error);
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Error shutting down ${this.name}:`, errorMessage);
    }
  }

  // Configuration validation helper
  protected validateConfig(config: any, requiredFields: string[]): boolean {
    const missingFields = requiredFields.filter((field) => !config[field]);

    if (missingFields.length > 0) {
      console.warn(
        `⚠️ ${this.name} configuration missing required fields: ${missingFields.join(', ')}`
      );
      return false;
    }

    return true;
  }

  // Health check helper
  protected isHealthy(): boolean {
    return true; // Override in specific providers
  }

  // Get provider status
  getStatus(): { name: string; healthy: boolean; initialized: boolean } {
    return {
      name: this.name,
      healthy: this.isHealthy(),
      initialized: false, // Override in specific providers
    };
  }
}
