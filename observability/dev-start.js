/**
 * Development Entry Point
 *
 * This script initializes observability services before starting the development server.
 * It uses the factory pattern for clean, extensible observability management.
 */

/* global process */

// How long the dev server gets to exit on its own before we force the issue.
// vite normally exits within ~1s of SIGTERM; this is the backstop, not the
// expected path.
const SHUTDOWN_GRACE_MS = 5000;

// The TTY delivers SIGINT to every process in the foreground group, and
// `bun run` forwards it again, so a single Ctrl+C can arrive here twice.
// Signals closer together than this are treated as one interrupt.
const DUPLICATE_SIGNAL_MS = 500;

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

  let shuttingDown = false;
  let shutdownStartedAt = 0;
  let forceKillTimer = null;

  const forwardSignal = (signal) => {
    try {
      devProcess.kill(signal);
    } catch (e) {
      console.warn(`⚠️ Failed to forward ${signal} to dev server:`, e?.message || e);
    }
  };

  const hardKill = () => {
    if (forceKillTimer) clearTimeout(forceKillTimer);
    forwardSignal('SIGKILL');
    // Registering a signal listener opts this process out of the default
    // terminate-on-signal behavior, so the exit has to be explicit.
    process.exit(0);
  };

  const handleSignal = () => {
    if (shuttingDown) {
      // Same interrupt arriving twice via different paths, not a new one.
      if (Date.now() - shutdownStartedAt < DUPLICATE_SIGNAL_MS) return;

      // A genuinely later interrupt means "I'm done waiting" — skip the grace period.
      console.log('⏹️ Second interrupt received, force killing dev server...');
      hardKill();
      return;
    }

    shuttingDown = true;
    shutdownStartedAt = Date.now();

    // Always ask with SIGTERM, whichever signal we received. vite ignores
    // SIGINT — observability installs a SIGINT listener inside that process
    // which suppresses default termination — but it exits promptly on SIGTERM.
    forwardSignal('SIGTERM');

    forceKillTimer = setTimeout(() => {
      console.warn(`⚠️ Dev server did not exit within ${SHUTDOWN_GRACE_MS}ms, force killing...`);
      hardKill();
    }, SHUTDOWN_GRACE_MS);
    // Don't let the grace timer itself hold the process open.
    forceKillTimer.unref?.();
  };

  process.on('SIGTERM', () => handleSignal());
  process.on('SIGINT', () => handleSignal());

  const exitCode = await devProcess.exited;
  if (forceKillTimer) clearTimeout(forceKillTimer);

  // A signal-initiated shutdown is a normal exit, not a failure. Reporting the
  // child's code here is what surfaced the confusing "exited with code 7".
  if (shuttingDown) {
    process.exit(0);
  }

  if (exitCode !== 0) {
    console.error(`❌ Development server exited with code ${exitCode}`);
    process.exit(exitCode);
  }

  process.exit(0);
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

      return loadAndStartDevServer();
    })
    .catch((error) => {
      console.error('❌ Error loading observability module:', error);
      // Continue with server startup even if observability fails
      console.log('⚠️ Starting development server without observability...');
      return loadAndStartDevServer();
    });
} catch (error) {
  console.error('❌ Error in development startup script:', error);
  process.exit(1);
}
