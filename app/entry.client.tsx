// Configure @hey-api clients before any React code runs
import '@/modules/control-plane/setup.client';
import { isKnownSystemEvent } from '@/modules/sentry/filters';
import { env } from '@/utils/env';
import * as Sentry from '@sentry/react-router';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

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

  // Capture Replay for 50% of all sessions for proactive UX monitoring,
  // plus 100% of sessions with an error
  replaysSessionSampleRate: 0.5,
  replaysOnErrorSampleRate: 1.0,

  // Release name
  release: env.public.version || 'dev',

  beforeSend: (event) => {
    if (isKnownSystemEvent(event)) return null;
    return event;
  },
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
