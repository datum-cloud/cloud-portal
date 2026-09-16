import { getIsStandalone } from '@/features/pwa/detect';
import { capturePwaInstallEvents } from '@/hooks/usePwaInstall';
import { configureBrowserClient } from '@/modules/control-plane/setup.client';
import { shouldDropSentryEventClient } from '@/modules/sentry/filters';
import { env } from '@/utils/env';
import * as Sentry from '@sentry/react-router';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

// Configure the shared control-plane client before any React code runs.
// Called explicitly (rather than relying on a bare side-effect import) so
// `"sideEffects": false` tree-shaking can't drop the registration from the
// production client bundle.
configureBrowserClient();

// Capture Chromium's install prompt before React hydrates — the event can fire
// as soon as the manifest and service worker are eligible.
capturePwaInstallEvents();

Sentry.init({
  dsn: env.public.sentryDsn ?? '',

  // Environment configuration
  environment: env.public.sentryEnv ?? 'development',

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  integrations: [
    // Performance
    Sentry.reactRouterTracingIntegration(),
    // Session replay with sensitive data masking
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
      blockAllMedia: false,

      // Mask sensitive fields
      mask: [
        '[data-sentry-mask]',
        'input[type="password"]',
        '[name*="secret"]',
        '[name*="token"]',
        '[name*="key"]',
        '[name*="credential"]',
      ],
      // Block entire sections from replay
      block: ['[data-sentry-block]'],
    }),
    // User feedback - disabled to remove "Report a Bug" button
    // Sentry.feedbackIntegration({
    //   // Additional SDK configuration goes in here, for example:
    //   colorScheme: 'system',
    // }),
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  tracesSampleRate: env.isProd ? 0.1 : 1.0, // Capture transactions

  // Set `tracePropagationTargets` to declare which URL(s) should have trace propagation enabled
  tracePropagationTargets: [/^\//, new RegExp(window.location.origin)],

  // Error-focused replay budget: 1% of ambient sessions for baseline UX
  // signal, 100% of sessions that hit an error.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Release name
  release: env.public.version || 'dev',

  // Browser noise that is never actionable. Hydration errors are
  // intentionally NOT ignored — they are real bugs. Chunk-load errors are
  // self-healed by the reload handler below in this file.
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /AbortError/,
    /Importing a module script failed/,
    /Failed to fetch dynamically imported module/,
  ],
  denyUrls: [
    /extensions\//,
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    /^safari-(web-)?extension:\/\//,
  ],

  // Client policy: drop expected user-state 4xx AND network failures (user
  // connectivity is not a bug). The server beforeSend
  // (observability/providers/sentry.ts) uses the base filter, which keeps
  // network failures — upstream connection errors are infra signals.
  beforeSend: (event, hint) => (shouldDropSentryEventClient(event, hint) ? null : event),
});

// Global handler for chunk load failures (stale deployments).
// When a lazy import fails because the chunk hash changed after a deployment,
// reload the page once to get fresh entry points. Uses sessionStorage to
// prevent infinite reload loops.
window.addEventListener('error', (event) => {
  const msg = event.message ?? '';
  if (
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch dynamically imported module')
  ) {
    const key = 'chunk-reload-attempted';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
  }
});

// Clear the chunk reload flag on successful page load
window.addEventListener('load', () => {
  sessionStorage.removeItem('chunk-reload-attempted');
});

const PWA_CLAIM_CLIENTS = 'CLAIM_CLIENTS';
const PWA_CLAIM_TIMEOUT_MS = 1500;

async function registerPwaServiceWorker() {
  const registration = await navigator.serviceWorker.register('/sw.js', {
    updateViaCache: 'none',
  });

  if (navigator.serviceWorker.controller) return;

  const worker = registration.active ?? registration.waiting ?? registration.installing;
  if (!worker) return;

  await new Promise<void>((resolve) => {
    let settled = false;
    let timeout = 0;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', done);
      resolve();
    };

    navigator.serviceWorker.addEventListener('controllerchange', done);
    timeout = window.setTimeout(done, PWA_CLAIM_TIMEOUT_MS);

    const claim = () => worker.postMessage(PWA_CLAIM_CLIENTS);
    if (worker.state === 'activated') {
      claim();
      return;
    }

    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') claim();
    });
  });
}

async function main() {
  if ('serviceWorker' in navigator) {
    const installedPwa = getIsStandalone();

    // Vite tabs must not be SW-controlled (HMR / GraphQL / SSE break). The
    // installed Chrome window still needs a worker or it will not apply
    // window-controls-overlay, so the native title bar stays system-white.
    if (import.meta.env.DEV && !installedPwa) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        await Promise.all(registrations.map((registration) => registration.unregister()));
        window.location.reload();
        return;
      }
    } else {
      try {
        await registerPwaServiceWorker();
      } catch {
        // Installability degrades silently if the SW fails to register.
      }
    }
  }

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    );
  });
}

main().catch((error) => console.error(error));
