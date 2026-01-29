/**
 * Development Entry Point
 *
 * This script initializes observability services before starting the development server.
 * It uses the factory pattern for clean, extensible observability management.
 */

/* global process */

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function checkRedisHealthOnStartup() {
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
    console.warn('⚠️  Redis health check skipped: failed to load ioredis', e?.message || e);
    return;
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
    console.warn('⚠️  Redis health check failed:', e?.message || e);
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

/**
 * Start the React Router development server
 */
async function startDevServer() {
  console.log('🌐 Starting React Router development server...');

  // Use bunx --bun vite for development (matches staff-portal)
  const devProcess = Bun.spawn(['bunx', '--bun', 'vite'], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env },
  });

  const forwardSignal = (signal) => {
    try {
      devProcess.kill(signal);
    } catch (e) {
      console.warn(`⚠️ Failed to forward ${signal} to dev server:`, e?.message || e);
    }
  };

  process.on('SIGTERM', () => forwardSignal('SIGTERM'));
  process.on('SIGINT', () => forwardSignal('SIGINT'));

  const exitCode = await devProcess.exited;
  if (exitCode !== 0) {
    console.error(`❌ Development server exited with code ${exitCode}`);
    process.exit(exitCode);
  }
}

/**
 * Load and start the development server
 */
function loadAndStartDevServer() {
  return startDevServer();
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

      // Fire-and-forget health check (do not block dev server startup)
      void checkRedisHealthOnStartup();

      return loadAndStartDevServer();
    })
    .catch((error) => {
      console.error('❌ Error loading observability module:', error);
      // Continue with server startup even if observability fails
      console.log('⚠️ Starting development server without observability...');
      void checkRedisHealthOnStartup();
      return loadAndStartDevServer();
    });
} catch (error) {
  console.error('❌ Error in development startup script:', error);
  process.exit(1);
}
