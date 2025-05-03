/**
 * OpenTelemetry Instrumentation Module
 *
 * This file must be loaded before any other modules to ensure proper instrumentation.
 * It initializes OpenTelemetry for monitoring and tracing in both Node.js and Bun environments.
 */

/* global process */

// ===== Environment Setup =====

// Load environment variables first
let dotenv
try {
  dotenv = require('dotenv')
  dotenv.config()
} catch (error) {
  dotenv = { config: () => {} }
  console.warn('dotenv not available:', error.message)
}

// Detect runtime environment
const isBun = typeof Bun !== 'undefined'
const runtimeEnv = isBun ? 'Bun' : 'Node.js'

// ===== OpenTelemetry Imports =====

// Import API first
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api')

// Configure logging
const logLevel =
  process.env.OTEL_LOG_LEVEL === 'debug' ? DiagLogLevel.DEBUG : DiagLogLevel.INFO
diag.setLogger(new DiagConsoleLogger(), logLevel)

// Import gRPC instrumentation before gRPC itself
const { GrpcInstrumentation } = require('@opentelemetry/instrumentation-grpc')

// Import gRPC with fallback for environments where it's not available
let credentials
try {
  const grpcJs = require('@grpc/grpc-js')
  credentials = grpcJs.credentials
} catch (error) {
  credentials = { createInsecure: () => ({}) }
  diag.debug('gRPC not available:', error.message)
}

// Import remaining OpenTelemetry modules
const { NodeSDK } = require('@opentelemetry/sdk-node')
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc')
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc')
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { RemixInstrumentation } = require('opentelemetry-instrumentation-remix')

// ===== Configuration =====

// Check if OpenTelemetry is enabled
const isOtelEnabled =
  process.env.OTEL_ENABLED === 'true' && process.env.OTEL_EXPORTER_OTLP_ENDPOINT

// Log configuration
diag.info(`Runtime: ${runtimeEnv}`)
diag.info(`OpenTelemetry enabled: ${isOtelEnabled}`)
diag.info(`Service name: ${process.env.OTEL_SERVICE_NAME || 'undefined'}`)
diag.info(`Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'undefined'}`)

// ===== SDK Initialization =====

if (!isOtelEnabled) {
  diag.info('OpenTelemetry is disabled - skipping initialization')
} else {
  // Configure instrumentations with environment-specific settings
  const instrumentations = [
    // Configure auto-instrumentations with environment-specific settings
    getNodeAutoInstrumentations({
      // Disable instrumentations that are problematic in Bun
      '@opentelemetry/instrumentation-runtime-node': { enabled: !isBun },
      '@opentelemetry/instrumentation-fs': { enabled: !isBun },
    }),
    // Add specific instrumentations
    new ExpressInstrumentation(),
    new RemixInstrumentation({}),
    new GrpcInstrumentation(),
  ]

  // Common exporter options
  const exporterOptions = {
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    credentials: credentials.createInsecure(),
    headers: {},
  }

  // Create SDK instance
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(exporterOptions),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(exporterOptions),
    }),
    instrumentations,
  })

  // Start SDK
  try {
    sdk.start()
    diag.info('OpenTelemetry initialized successfully')
  } catch (error) {
    diag.error('Failed to initialize OpenTelemetry', error)
  }

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    diag.info('SIGTERM received, shutting down OpenTelemetry')
    sdk
      .shutdown()
      .then(() => diag.info('OpenTelemetry shut down successfully'))
      .catch((error) => diag.error('Error shutting down OpenTelemetry', error))
      .finally(() => process.exit(0))
  })
}
