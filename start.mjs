/**
 * Application Entry Point
 *
 * This script initializes OpenTelemetry instrumentation before starting the application.
 * It's designed to work with both Node.js and Bun runtimes.
 *
 * @global process Node.js/Bun process object
 */

/* global process */

console.log('Starting application...')

try {
  // Load OpenTelemetry instrumentation first
  console.log('Loading instrumentation...')
  require('./instrumentation.cjs')
  console.log('Instrumentation loaded successfully')

  // Set production environment
  process.env.NODE_ENV = 'production'

  // Start the server using dynamic import for TypeScript support
  console.log('Loading server...')
  import('./server.ts').catch((e) => {
    console.error('Error importing server.ts:', e)
    process.exit(1)
  })
} catch (error) {
  console.error('Error starting application:', error)
  process.exit(1)
}
