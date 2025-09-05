import { sentryConfig } from './app/utils/sentry';
import type { Config } from '@react-router/dev/config';
import { sentryOnBuildEnd } from '@sentry/react-router';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    if (sentryConfig.isSourcemapEnabled) {
      await sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest });
    }
  },
} satisfies Config;
