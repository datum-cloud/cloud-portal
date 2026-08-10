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

async function main() {
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
