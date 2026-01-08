/**
 * Production Entry Point
 *
 * This script initializes observability services before starting the application.
 * It uses the factory pattern for clean, extensible observability management.
 */

/* global process */

console.log('🚀 Starting application in production environment...');

/**
 * Start the Bun server with the given module
 */
function startServer(module) {
  // Check if we have a Bun server with fetch method
  if (typeof module.default.fetch === 'function') {
    console.log(`🌐 Starting Bun server on port ${module.default.port}`);
    Bun.serve({
      port: module.default.port,
      fetch: module.default.fetch,
      development: module.default.development,
    });
    console.log(`✅ Server started successfully on port ${module.default.port}`);
  } else {
    console.log(`⚠️ Server object does not have fetch method, assuming it's already running`);
    console.log(`✅ Server started successfully on port ${module.default.port}`);
  }
}

/**
 * Load and start the server
 */
function loadAndStartServer() {
  return import('../build/server/index.js').then(startServer).catch((error) => {
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
