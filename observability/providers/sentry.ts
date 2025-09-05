import { BaseProvider } from './base';
import * as Sentry from '@sentry/react-router';

// ============================================================================
// SENTRY PROVIDER
// ============================================================================

export class SentryProvider extends BaseProvider {
  name = 'Sentry';

  // ============================================================================
  // PRIVATE PROPERTIES
  // ============================================================================

  private isEnabled = !!process.env.SENTRY_DSN;
  private circuitBreakerOpen = false;
  private exportErrorCount = 0;
  private readonly MAX_ERRORS = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

  // Sentry-specific error patterns
  private readonly errorPatterns = [
    '@sentry',
    'sentry',
    'raven',
    'dsn',
    'sentry.io',
    'sentry dsn',
    'sentry transport',
    'sentry client',
    'sentry api',
    'sentry request',
    'sentry response',
    'sentry rate limit',
    'sentry quota',
    'sentry project',
    'sentry organization',
  ];

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async initialize(): Promise<boolean> {
    return this.safeInitialize(async () => {
      if (!this.isEnabled) {
        this.logDisabledStatus();
        return false;
      }

      const config = this.createConfig();
      if (!config) {
        console.log('📊 Sentry configuration not available');
        return false;
      }

      Sentry.init(config);
      this.logInitializationStatus();
      return true;
    });
  }

  shutdown(): void {
    this.safeShutdown(() => {
      Sentry.close(2000)
        .then(() => {
          console.log('✅ Sentry closed successfully');
        })
        .catch((error) => {
          console.log('❌ Error closing Sentry', error);
        });
    });
  }

  isError(error: Error | any): boolean {
    return this.matchesPatterns(error, this.errorPatterns);
  }

  // Override base status to include Sentry-specific state
  getStatus(): { name: string; healthy: boolean; initialized: boolean } {
    return {
      name: this.name,
      healthy: !this.circuitBreakerOpen && this.isEnabled,
      initialized: this.isEnabled,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private logDisabledStatus(): void {
    console.log('📊 Sentry is disabled or DSN not configured');
    console.log('📊 SENTRY_DSN:', process.env.SENTRY_DSN || 'not configured');
  }

  private logInitializationStatus(): void {
    console.log('📊 SENTRY_ENV:', process.env.SENTRY_ENV || 'development');
    console.log('📊 SENTRY_DSN:', process.env.SENTRY_DSN || 'not configured');
  }

  private createConfig() {
    if (!this.isEnabled) return null;

    return {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENV || 'development',
      sendDefaultPii: true,
      enableLogs: true,
      skipOpenTelemetrySetup: true,
      tracesSampleRate: this.getTracesSampleRate(),
      profilesSampleRate: 0, // Not supported in Bun
      release: process.env.VERSION || 'dev',

      // Circuit breaker implementation
      beforeSend: this.createBeforeSendHandler(),
      beforeBreadcrumb: this.createBeforeBreadcrumbHandler(),
    };
  }

  private getTracesSampleRate(): number {
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
  }

  private createBeforeSendHandler() {
    return (event: any, hint: any) => {
      if (this.circuitBreakerOpen) {
        console.warn('⚠️ Sentry circuit breaker open, skipping event');
        return null;
      }

      try {
        return event;
      } catch (error) {
        this.handleBeforeSendError(error);
        return null;
      }
    };
  }

  private createBeforeBreadcrumbHandler() {
    return (breadcrumb: any) => {
      try {
        return breadcrumb;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ Sentry beforeBreadcrumb failed:', errorMessage);
        return null;
      }
    };
  }

  private handleBeforeSendError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ Sentry beforeSend failed:', errorMessage);

    this.exportErrorCount++;
    if (this.exportErrorCount >= this.MAX_ERRORS) {
      this.openCircuitBreaker();
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    console.warn(
      `⚠️ Sentry circuit breaker opened after ${this.MAX_ERRORS} errors. Disabling exports for ${this.CIRCUIT_BREAKER_TIMEOUT}ms`
    );

    setTimeout(() => {
      this.resetCircuitBreaker();
    }, this.CIRCUIT_BREAKER_TIMEOUT);
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.exportErrorCount = 0;
    console.log('✅ Sentry circuit breaker reset, exports re-enabled');
  }
}
