import { sentryConfig } from './app/utils/config/sentry.config';
import type { Config } from '@react-router/dev/config';
import { sentryOnBuildEnd } from '@sentry/react-router';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // The gateway terminates TLS, so the server sees http:// while browsers send
  // an https:// Origin. React Router 8.3.1 compares the two schemefully before
  // running any action, so the public hosts are allowed by name instead.
  allowedActionOrigins: ['cloud.datum.net', 'cloud.*.env.datum.net'],
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    if (sentryConfig.isSourcemapEnabled) {
      await sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest });
    }
  },
} satisfies Config;
