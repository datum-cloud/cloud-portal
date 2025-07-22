/**
 * Docker Entry Point
 *
 * This script initializes OpenTelemetry instrumentation before starting the application.
 * It's designed specifically for the Docker/Bun environment.
 */

/* global process */

console.log('Starting application in Docker environment...');

try {
  // Load OpenTelemetry first
  console.log('Loading OpenTelemetry instrumentation...');
  import('./otel.ts')
    .then(async (otelModule) => {
      // Initialize OpenTelemetry manually
      const isOtelInitialized = await otelModule.initializeOtel();
      if (isOtelInitialized) {
        console.log('✅ OpenTelemetry loaded successfully');
      }

      // Then load the server
      console.log('Starting server...');
      import('./server.ts').catch((error) => {
        console.error('Error loading server:', error);
        process.exit(1);
      });
    })
    .catch((error) => {
      console.error('Error loading OpenTelemetry:', error);
      // Continue with server startup even if OpenTelemetry fails
      console.log('Starting server without OpenTelemetry...');
      import('./server.ts').catch((error) => {
        console.error('Error loading server:', error);
        process.exit(1);
      });
    });
} catch (error) {
  console.error('Error in startup script:', error);
  process.exit(1);
}
