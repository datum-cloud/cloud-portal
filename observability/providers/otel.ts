import { BaseProvider } from './base';
import { Client, credentials } from '@grpc/grpc-js';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

// ============================================================================
// OTEL PROVIDER
// ============================================================================

export class OtelProvider extends BaseProvider {
  name = 'OpenTelemetry';

  // ============================================================================
  // PRIVATE PROPERTIES
  // ============================================================================

  private isEnabled =
    process.env.OTEL_ENABLED === 'true' && !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  private circuitBreakerOpen = false;
  private exportErrorCount = 0;
  private readonly MAX_ERRORS = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000;

  // Instance state
  private sdk: NodeSDK | null = null;
  private isInitialized = false;

  // OpenTelemetry-specific error patterns
  private readonly errorPatterns = [
    '@opentelemetry',
    'opentelemetry',
    'otlp',
    'http2',
    '@grpc',
    'grpc',
    'controller is already closed',
    'transport.js',
    'load-balancing-call.js',
    'maximum call stack size exceeded',
    'rststream',
    'markstreamclosed',
    'otlp exporter',
    'otlp endpoint',
    'otlp collector',
    'span processor',
    'batch span processor',
    'trace exporter',
    'metrics exporter',
    'otel sdk',
    'node sdk',
    'attempted duplicate registration',
    'already registered',
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

      if (this.isInitialized) {
        console.log('✅ OpenTelemetry already initialized');
        return true;
      }

      return await this.initializeSdk();
    });
  }

  shutdown(): void {
    this.safeShutdown(() => {
      this.shutdownSdk();
    });
  }

  isError(error: Error | any): boolean {
    return this.matchesPatterns(error, this.errorPatterns);
  }

  // Override base status to include OTEL-specific state
  getStatus(): { name: string; healthy: boolean; initialized: boolean } {
    return {
      name: this.name,
      healthy: !this.circuitBreakerOpen && this.isEnabled,
      initialized: this.isInitialized,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private logDisabledStatus(): void {
    console.log('📊 OpenTelemetry is disabled or endpoint not configured');
    console.log('📊 OTEL_ENABLED:', process.env.OTEL_ENABLED);
    console.log('📊 OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  }

  private async initializeSdk(): Promise<boolean> {
    try {
      this.setupLogging();
      await this.testConnectivity();
      await this.createAndStartSdk();

      this.isInitialized = true;
      this.logInitializationSuccess();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.isDuplicateRegistrationError(errorMessage)) {
        console.log('🔍 OpenTelemetry already registered, marking as initialized');
        this.isInitialized = true;
        return true;
      }

      console.error('❌ OpenTelemetry SDK start failed:', errorMessage);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      console.warn('⚠️ Continuing without OpenTelemetry due to initialization error');
      return false;
    }
  }

  private setupLogging(): void {
    if (process.env.NODE_ENV === 'development') {
      const logLevel =
        process.env.OTEL_LOG_LEVEL === 'debug' ? DiagLogLevel.DEBUG : DiagLogLevel.INFO;
      diag.setLogger(new DiagConsoleLogger(), logLevel);
    }
  }

  private async testConnectivity(): Promise<void> {
    if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

    console.log('🔍 Testing OTLP endpoint connectivity...');
    console.log('📊 Endpoint to test:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

    const isConnected = await this.testOtlpConnectivity(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

    if (!isConnected) {
      console.warn(
        '⚠️ OTLP endpoint is not reachable. OpenTelemetry will still start but may fail to export traces.'
      );
      console.warn('📊 Make sure the OTLP collector is running and accessible.');
    } else {
      console.log('✅ OTLP endpoint is reachable');
    }
  }

  private async createAndStartSdk(): Promise<void> {
    const sdk = this.createSdk();
    if (!sdk) {
      throw new Error('Failed to create OpenTelemetry SDK');
    }

    this.sdk = sdk;
    this.sdk.start();
  }

  private logInitializationSuccess(): void {
    console.log('✅ OpenTelemetry initialized successfully');
    console.log('📊 OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
    console.log('📊 OTEL_EXPORTER_TIMEOUT:', process.env.OTEL_EXPORTER_TIMEOUT || '10000');
  }

  private shutdownSdk(): void {
    if (this.sdk) {
      this.sdk
        .shutdown()
        .then(() => {
          console.log('✅ OpenTelemetry SDK shut down successfully');
          this.sdk = null;
          this.isInitialized = false;
        })
        .catch((error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log('❌ Error shutting down OpenTelemetry SDK:', errorMessage);
        });
    }
  }

  private async testOtlpConnectivity(endpoint: string): Promise<boolean> {
    try {
      const url = new URL(endpoint.startsWith('http') ? endpoint : `http://${endpoint}`);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port) : 4317;

      const client = new Client(`${host}:${port}`, credentials.createInsecure());

      return new Promise((resolve) => {
        const deadline = new Date();
        deadline.setSeconds(deadline.getSeconds() + 3);

        client.waitForReady(deadline, (error) => {
          client.close();
          resolve(!error);
        });
      });
    } catch (error) {
      console.warn('⚠️ OTLP connectivity test failed:', error);
      return false;
    }
  }

  private createSdk(): NodeSDK | null {
    const exporter = this.createRobustExporter();
    if (!exporter) return null;

    return new NodeSDK({
      instrumentations: [getNodeAutoInstrumentations()],
      spanProcessors: [
        new BatchSpanProcessor(exporter, {
          maxQueueSize: 1000,
          maxExportBatchSize: 50,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 8000,
        }),
      ],
    });
  }

  private createRobustExporter() {
    const exporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
      credentials: credentials.createInsecure(),
      timeoutMillis: parseInt(process.env.OTEL_EXPORTER_TIMEOUT || '10000'),
      headers: {},
    });

    // Wrap the exporter with error handling
    const wrappedExporter = {
      ...exporter,
      export: async (spans: any, resultCallback: any) => {
        if (this.circuitBreakerOpen) {
          console.warn('⚠️ Circuit breaker open, skipping export');
          if (resultCallback) {
            resultCallback({ code: 0 });
          }
          return;
        }

        try {
          const result = exporter.export(spans, resultCallback);
          this.exportErrorCount = 0;
          return result;
        } catch (error) {
          this.handleExportError(error, resultCallback);
        }
      },
      shutdown: async () => {
        try {
          return await exporter.shutdown();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn('⚠️ OpenTelemetry shutdown failed:', errorMessage);
          return;
        }
      },
    };

    return wrappedExporter;
  }

  private handleExportError(error: unknown, resultCallback: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ OpenTelemetry export failed:', errorMessage);

    if (error instanceof RangeError || errorMessage.includes('Maximum call stack size exceeded')) {
      console.warn('⚠️ Detected HTTP2/gRPC stack overflow, skipping export');
    }

    this.exportErrorCount++;
    if (this.exportErrorCount >= this.MAX_ERRORS) {
      this.openCircuitBreaker();
    }

    if (resultCallback) {
      resultCallback({ code: 0 });
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    console.warn(
      `⚠️ Circuit breaker opened after ${this.MAX_ERRORS} errors. Disabling exports for ${this.CIRCUIT_BREAKER_TIMEOUT}ms`
    );

    setTimeout(() => {
      this.resetCircuitBreaker();
    }, this.CIRCUIT_BREAKER_TIMEOUT);
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.exportErrorCount = 0;
    console.log('✅ Circuit breaker reset, exports re-enabled');
  }

  private isDuplicateRegistrationError(errorMessage: string): boolean {
    return (
      errorMessage.includes('Attempted duplicate registration') ||
      errorMessage.includes('already registered')
    );
  }
}
