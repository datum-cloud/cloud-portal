import { Client, credentials } from '@grpc/grpc-js';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import 'dotenv/config';
import { RemixInstrumentation } from 'opentelemetry-instrumentation-remix';

const isOtelEnabled =
  process.env.OTEL_ENABLED === 'true' && process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// Helper function to test OTLP endpoint connectivity
async function testOtlpConnectivity(endpoint: string): Promise<boolean> {
  try {
    // Parse the OTLP endpoint to extract host and port
    const url = new URL(endpoint.startsWith('http') ? endpoint : `http://${endpoint}`);
    const host = url.hostname;
    const port = url.port ? parseInt(url.port) : 4317; // Default OTLP gRPC port

    const client = new Client(`${host}:${port}`, credentials.createInsecure());

    return new Promise((resolve) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 3); // Reduced timeout to 3 seconds

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

// Circuit breaker for OpenTelemetry exports
let exportErrorCount = 0;
let circuitBreakerOpen = false;
const MAX_ERRORS = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

// Create a robust exporter with error handling
const createRobustExporter = () => {
  if (!isOtelEnabled) return null;

  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
    credentials: credentials.createInsecure(),
    timeoutMillis: parseInt(process.env.OTEL_EXPORTER_TIMEOUT || '10000'), // Reduced timeout
    headers: {},
  });

  // Wrap the exporter with error handling
  const wrappedExporter = {
    ...exporter,
    export: async (spans: any, resultCallback: any) => {
      // Check circuit breaker
      if (circuitBreakerOpen) {
        console.warn('⚠️ Circuit breaker open, skipping export');
        if (resultCallback) {
          resultCallback({ code: 0 });
        }
        return;
      }

      try {
        const result = exporter.export(spans, resultCallback);
        // Reset error count on success
        exportErrorCount = 0;
        return result;
      } catch (error) {
        // Log the error but don't crash the app
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ OpenTelemetry export failed:', errorMessage);

        // For HTTP2/gRPC errors, be extra defensive
        if (
          error instanceof RangeError ||
          errorMessage.includes('Maximum call stack size exceeded')
        ) {
          console.warn('⚠️ Detected HTTP2/gRPC stack overflow, skipping export');
        }

        // Increment error count and check circuit breaker
        exportErrorCount++;
        if (exportErrorCount >= MAX_ERRORS) {
          circuitBreakerOpen = true;
          console.warn(
            `⚠️ Circuit breaker opened after ${MAX_ERRORS} errors. Disabling exports for ${CIRCUIT_BREAKER_TIMEOUT}ms`
          );

          // Reset circuit breaker after timeout
          setTimeout(() => {
            circuitBreakerOpen = false;
            exportErrorCount = 0;
            console.log('✅ Circuit breaker reset, exports re-enabled');
          }, CIRCUIT_BREAKER_TIMEOUT);
        }

        // Call the result callback with success to prevent retries
        if (resultCallback) {
          resultCallback({ code: 0 }); // Success code to prevent retries
        }

        return;
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
};

// Create SDK configuration with robust error handling
const createSDK = () => {
  if (!isOtelEnabled) return null;

  const exporter = createRobustExporter();
  if (!exporter) return null;

  return new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations(),
      new ExpressInstrumentation(),
      new RemixInstrumentation({}),
    ],
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        // More conservative batch settings for production
        maxQueueSize: 1000, // Reduced from default
        maxExportBatchSize: 50, // Reduced from default
        scheduledDelayMillis: 5000, // Increased delay
        exportTimeoutMillis: 8000, // Reduced timeout
      }),
    ],
  });
};

const sdk = createSDK();

// Initialize OpenTelemetry with error handling
async function initializeOtel() {
  try {
    if (!isOtelEnabled) {
      console.log('📊 OpenTelemetry is disabled or endpoint not configured');
      console.log('📊 OTEL_ENABLED:', process.env.OTEL_ENABLED);
      console.log('📊 OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
      return false;
    }

    // Enable logging for development only
    if (process.env.NODE_ENV === 'development') {
      const logLevel =
        process.env.OTEL_LOG_LEVEL === 'debug' ? DiagLogLevel.DEBUG : DiagLogLevel.INFO;
      diag.setLogger(new DiagConsoleLogger(), logLevel);
    }

    // Test connectivity before starting (but don't fail if it doesn't work)
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      console.log('🔍 Testing OTLP endpoint connectivity...');
      console.log('📊 Endpoint to test:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

      const isConnected = await testOtlpConnectivity(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

      if (!isConnected) {
        console.warn(
          '⚠️  OTLP endpoint is not reachable. OpenTelemetry will still start but may fail to export traces.'
        );
        console.warn('📊 Make sure the OTLP collector is running and accessible.');
      } else {
        console.log('✅ OTLP endpoint is reachable');
      }
    }

    try {
      sdk?.start();
      console.log('✅ OpenTelemetry initialized successfully');
      console.log('📊 OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
      console.log('📊 OTEL_EXPORTER_TIMEOUT:', process.env.OTEL_EXPORTER_TIMEOUT || '10000');
    } catch (error) {
      console.error('❌ Error initializing OpenTelemetry:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      // Don't throw - let the app continue without telemetry
      console.warn('⚠️ Continuing without OpenTelemetry due to initialization error');
      return false;
    }
  } catch (error) {
    console.error('❌ Unexpected error during OpenTelemetry initialization:', error);
    console.warn('⚠️ Continuing without OpenTelemetry due to unexpected error');
    return false;
  }

  return true;
}

// Export the initialization function for manual control
export { initializeOtel };

// Graceful shutdown with error handling
process.on('SIGTERM', () => {
  if (sdk) {
    sdk
      .shutdown()
      .then(() => console.log('✅ SDK shut down successfully'))
      .catch((error) => {
        console.log('❌ Error shutting down SDK', error);
        // Don't let shutdown errors crash the app
      })
      .finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

// Helper function to check if error is from OpenTelemetry
function isOtelError(error: Error | any): boolean {
  // Check error message and stack trace for OpenTelemetry indicators
  const errorMessage = (error?.message || '').toLowerCase();
  const errorStack = (error?.stack || '').toLowerCase();
  const errorName = (error?.name || '').toLowerCase();

  // Convert error to string using toString() which works better for Error objects
  const errorString = String(error || '').toLowerCase();

  console.log('🔍 Debug: Checking error:', {
    message: errorMessage,
    name: errorName,
    stack: errorStack.substring(0, 200) + '...',
    stringified: errorString.substring(0, 200) + '...',
  });

  // Patterns that indicate OpenTelemetry/gRPC errors
  const otelPatterns = [
    '@opentelemetry',
    'opentelemetry',
    'otlp',
    'http2',
    '@grpc',
    'controller is already closed',
    'transport.js',
    'load-balancing-call.js',
    'maximum call stack size exceeded',
    'rststream',
    'markstreamclosed',
  ];

  // Check all error properties against the patterns
  const errorTexts = [errorMessage, errorStack, errorString];

  return otelPatterns.some((pattern) => errorTexts.some((text) => text.includes(pattern)));
}

// Handle uncaught exceptions related to OpenTelemetry
process.on('uncaughtException', (error) => {
  const isOtel = isOtelError(error);
  if (isOtel) {
    console.warn('⚠️ Caught OpenTelemetry-related error, continuing:', error.message);
    console.warn('📊 This is likely a gRPC/HTTP2 connection issue that can be safely ignored');
    // Don't exit the process for OpenTelemetry errors
    return;
  }

  // For other uncaught exceptions, let them bubble up
  console.error('❌ Non-OpenTelemetry uncaught exception, re-throwing:', error.message);
  throw error;
});

// Handle unhandled promise rejections related to OpenTelemetry
process.on('unhandledRejection', (reason, promise) => {
  const isOtel = isOtelError(reason);
  if (isOtel) {
    const errorMessage = reason?.toString() || '';
    console.warn('⚠️ Caught OpenTelemetry-related promise rejection, continuing:', errorMessage);
    console.warn('📊 This is likely a gRPC/HTTP2 connection issue that can be safely ignored');
    // Don't exit the process for OpenTelemetry errors
    return;
  }

  // For other unhandled rejections, let them bubble up
  console.error('❌ Non-OpenTelemetry unhandled rejection at:', promise, 'reason:', reason);
});
