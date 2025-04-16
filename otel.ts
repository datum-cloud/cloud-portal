import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import dotenv from 'dotenv'
import { RemixInstrumentation } from 'opentelemetry-instrumentation-remix'

dotenv.config()

const isOtelEnabled =
  process.env.OTEL_ENABLED === 'true' && process.env.OTEL_EXPORTER_OTLP_ENDPOINT

const sdk = isOtelEnabled
  ? new NodeSDK({
      serviceName: 'cloud-portal',
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        }),
      }),
      instrumentations: [
        getNodeAutoInstrumentations(),
        new ExpressInstrumentation(),
        new RemixInstrumentation({
          enabled: true,
        }),
      ],
    })
  : null

export function startOpenTelemetry() {
  if (!isOtelEnabled) {
    console.log('OpenTelemetry is disabled or endpoint not configured')
    console.log('OTEL_ENABLED:', process.env.OTEL_ENABLED)
    console.log('OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT)
    return
  }

  try {
    sdk?.start()
    console.log('OpenTelemetry initialized successfully')
  } catch (error) {
    console.error('Error initializing OpenTelemetry:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
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
      .finally(() => process.exit(0))
  } else {
    process.exit(0)
  }
})
