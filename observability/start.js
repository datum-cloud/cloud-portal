/**
 * Production Entry Point
 *
 * This script initializes observability services before starting the application.
 * It uses the factory pattern for clean, extensible observability management.
 */

/* global process */

console.log('🚀 Starting application in production environment...');

/**
 * Load the server module. Importing it starts the server: in production,
 * react-router-hono-server's Bun adapter calls Bun.serve() itself and owns
 * graceful shutdown (see app/server/entry.ts). Do not call Bun.serve() here
 * as well; a second server on the same port gets its own settings and takes
 * a share of the connections.
 */
function loadAndStartServer() {
  return import('../build/server/index.js').catch((error) => {
    console.error('❌ Error loading server:', error);
    process.exit(1);
  });
}

try {
  // Load observability services first
  console.log('📊 Loading observability services...');

  import('./index.ts')
    .then(async (observabilityModule) => {
      try {
        // Initialize observability with all providers
        const results = await observabilityModule.initializeObservability();
        console.log('📊 Observability initialization results:', results);
      } catch (observabilityError) {
        console.warn(
          '⚠️ Observability initialization failed, continuing without observability:',
          observabilityError?.message || observabilityError
        );
      }

      return loadAndStartServer();
    })
    .catch((error) => {
      console.error('❌ Error loading observability module:', error);
      // Continue with server startup even if observability fails
      console.log('⚠️ Starting server without observability...');
      return loadAndStartServer();
    });
} catch (error) {
  console.error('❌ Error in startup script:', error);
  process.exit(1);
}
