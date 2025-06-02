import { credentials } from '@grpc/grpc-js';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NodeSDK } from '@opentelemetry/sdk-node';
import 'dotenv/config';
import { RemixInstrumentation } from 'opentelemetry-instrumentation-remix';

const isOtelEnabled =
  process.env.OTEL_ENABLED === 'true' && process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const sdk = isOtelEnabled
  ? new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        credentials: credentials.createInsecure(),
      }),
      instrumentations: [
        getNodeAutoInstrumentations(),
        new ExpressInstrumentation(),
        new RemixInstrumentation({}),
      ],
    })
  : null;

if (!isOtelEnabled) {
  console.log('OpenTelemetry is disabled or endpoint not configured');
  console.log('OTEL_ENABLED:', process.env.OTEL_ENABLED);
  console.log('OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
} else {
  // Enable logging for development
  if (process.env.NODE_ENV === 'development') {
    const logLevel =
      process.env.OTEL_LOG_LEVEL === 'debug' ? DiagLogLevel.DEBUG : DiagLogLevel.INFO;
    diag.setLogger(new DiagConsoleLogger(), logLevel);
  }

  try {
    sdk?.start();
    console.log('OpenTelemetry initialized successfully');
    console.log('OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  } catch (error) {
    console.error('Error initializing OpenTelemetry:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  if (sdk) {
    sdk
      .shutdown()
      .then(() => console.log('SDK shut down successfully'))
      .catch((error) => console.log('Error shutting down SDK', error))
      .finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
});
