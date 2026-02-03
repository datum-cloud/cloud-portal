// Configure @hey-api clients before any React code runs
import '@/modules/control-plane/setup.client';
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
