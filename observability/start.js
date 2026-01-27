/**
 * Production Entry Point
 *
 * This script initializes observability services before starting the application.
 * It uses the factory pattern for clean, extensible observability management.
 */

/* global process */

console.log('🚀 Starting application in production environment...');

const SHUTDOWN_TIMEOUT_MS = Number.parseInt('25000', 10);
const SHUTDOWN_POLL_MS = 50;

let shuttingDown = false;
let activeRequests = 0;
let server = null;
let shutdownObservability = null;
let redisHealthChecked = false;

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function checkRedisHealthOnStartup() {
  if (redisHealthChecked) return;
  redisHealthChecked = true;

  const url = process.env?.REDIS_URL;
  if (!url) {
    console.log('🔴 Redis: Disabled (REDIS_URL not configured)');
    return;
  }

  const connectTimeout = 5000;
  const commandTimeout = 3000;

  let Redis;
  try {
    ({ default: Redis } = await import('ioredis'));
  } catch (e) {
    throw new Error(`Redis health check failed: unable to load ioredis (${e?.message || e})`);
  }

  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    connectTimeout,
    commandTimeout,
    retryStrategy: () => null,
  });

  const start = Date.now();
  try {
    await withTimeout(client.connect(), connectTimeout, 'Redis connect');
    await withTimeout(client.ping(), commandTimeout, 'Redis ping');
    console.log('🔴 Redis: Health check passed', { latencyMs: Date.now() - start });
  } catch (e) {
    throw new Error(`Redis health check failed: ${e?.message || e}`);
  } finally {
    try {
      await client.quit();
    } catch {
      try {
        client.disconnect();
      } catch {
        // ignore
      }
    }
  }
}

async function waitForDrainOrTimeout(timeoutMs) {
  const start = Date.now();
  while (activeRequests > 0 && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, SHUTDOWN_POLL_MS));
  }
}

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`🛑 Received ${signal}, beginning graceful shutdown...`);

  // Stop accepting new connections/requests ASAP.
  if (server && typeof server.stop === 'function') {
    try {
      server.stop(true);
    } catch {
      try {
        server.stop();
      } catch (e) {
        console.warn('⚠️ Failed to stop Bun server:', e?.message || e);
      }
    }
  }

  // Wait for in-flight requests to finish (bounded).
  await waitForDrainOrTimeout(SHUTDOWN_TIMEOUT_MS);

  if (activeRequests > 0) {
    console.warn(`⚠️ Shutdown timeout reached with ${activeRequests} request(s) still in-flight`);
  } else {
    console.log('✅ All in-flight requests drained');
  }

  // Flush/stop observability last.
  if (typeof shutdownObservability === 'function') {
    try {
      shutdownObservability();
    } catch (e) {
      console.warn('⚠️ Error during observability shutdown:', e?.message || e);
    }
  }

  // Exit cleanly. If Bun keeps the event loop alive, force it.
  process.exit(0);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

/**
 * Start the Bun server with the given module
 */
function startServer(module) {
  // Check if we have a Bun server with fetch method
  if (typeof module.default.fetch === 'function') {
    console.log(`🌐 Starting Bun server on port ${module.default.port}`);
    const originalFetch = module.default.fetch;
    const fetchWithDrain = async (req, ...rest) => {
      // If we are shutting down, fail fast for non-health endpoints.
      // (Health/readiness routes are handled inside the server module.)
      activeRequests += 1;
      try {
        return await originalFetch(req, ...rest);
      } finally {
        activeRequests -= 1;
      }
    };

    server = Bun.serve({
      port: module.default.port,
      fetch: fetchWithDrain,
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
        shutdownObservability = observabilityModule.shutdownObservability;
      } catch (observabilityError) {
        console.warn(
          '⚠️ Observability initialization failed, continuing without observability:',
          observabilityError?.message || observabilityError
        );
      }

      try {
        await checkRedisHealthOnStartup();
      } catch (e) {
        console.error('❌', e?.message || e);
        process.exit(1);
      }

      return loadAndStartServer();
    })
    .catch((error) => {
      console.error('❌ Error loading observability module:', error);
      // Continue with server startup even if observability fails
      console.log('⚠️ Starting server without observability...');
      checkRedisHealthOnStartup()
        .then(loadAndStartServer)
        .catch((e) => {
          console.error('❌', e?.message || e);
          process.exit(1);
        });
    });
} catch (error) {
  console.error('❌ Error in startup script:', error);
  process.exit(1);
}
