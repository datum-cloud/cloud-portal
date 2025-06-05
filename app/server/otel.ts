import { env } from '@/utils/config/env.server';
import { credentials } from '@grpc/grpc-js';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

// Initialize SDK with optimized configuration
const initializeSDK = () => {
  if (!env.isOtelEnabled) {
    return null;
  }

  if (env.isDev) {
    const logLevel = env.OTEL_LOG_LEVEL === 'debug' ? DiagLogLevel.DEBUG : DiagLogLevel.INFO;
    diag.setLogger(new DiagConsoleLogger(), logLevel);
  }

  // Configure batch span processor for better performance
  const spanProcessor = new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      credentials: credentials.createInsecure(),
    })
  );
  const consoleExporter = new ConsoleSpanExporter();

  return new NodeSDK({
    spanProcessors: [spanProcessor],
    instrumentations: [getNodeAutoInstrumentations()],
    traceExporter: consoleExporter,
  });
};

const sdk = initializeSDK();
if (!sdk) {
  throw new Error('OpenTelemetry is disabled or endpoint not configured');
} else {
  try {
    await sdk.start();
  } catch (error) {
    throw new Error(`Error initializing OpenTelemetry: ${error}`);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      await sdk.shutdown();
    } catch (error) {
      throw new Error(`Error shutting down SDK: ${error}`);
    } finally {
      process.exit(0);
    }
  });
}
