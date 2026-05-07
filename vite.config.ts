import { sentryConfig } from './app/utils/config/sentry.config';
import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// react-router-hono-server@2.25.x loads the Bun server adapter through
// Vite's SSRCompatModuleRunner during dev. Several hono/bun/* modules
// reference the `Bun` global which doesn't exist in the SSR module runner.
// This plugin guards those accesses. ssr.noExternal: ['hono'] is required
// so Vite processes hono through its transform pipeline.
function patchHonoBunAdapter(): Plugin {
  return {
    name: 'patch-hono-bun-adapter',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.includes('hono') || !id.includes('adapter/bun')) return;

      // ssg.js: top-level `var { write } = Bun;` crashes on module load
      if (id.includes('ssg')) {
        return code.replace(
          'var { write } = Bun;',
          'var write = typeof Bun !== "undefined" ? Bun.write : undefined;'
        );
      }

      // serve-static.js: `Bun.file()` called at request time — in dev Vite
      // handles static files so we can safely return null to pass through
      if (id.includes('serve-static')) {
        return code.replace(
          'const file = Bun.file(path);',
          'if (typeof Bun === "undefined") return null;\n      const file = Bun.file(path);'
        );
      }
    },
  };
}

// Workaround for issue with running react router in a production build
//
// See: https://github.com/remix-run/react-router/issues/12568#issuecomment-2629986004

export default defineConfig((config) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const aliases: { [key: string]: string } = {
    '@': resolve(__dirname, './app'),
  };

  return {
    resolve: {
      alias: aliases,
    },
    server: {
      port: 3000,
    },
    optimizeDeps: {
      include: [
        // Pre-bundle all datum-ui subpath exports so navigating to a route
        // that pulls in a not-yet-seen component doesn't trigger a re-optimize
        // + full page reload in dev.
        '@datum-cloud/datum-ui/*',
        'recharts',
        'class-variance-authority',
        'd3-geo',
        'nuqs',
        'motion/react',
      ],
    },
    ssr: {
      optimizeDeps: {
        include: ['react-dom/server.node'],
      },
      // Force hono through Vite's transform pipeline so patchHonoBunAdapter()
      // can guard the top-level `Bun` reference in hono/bun/ssg.js.
      // Without this, SSR external modules bypass all transform hooks.
      noExternal: ['hono'],
    },
    plugins: [
      patchHonoBunAdapter(),
      tailwindcss(),
      reactRouterHonoServer({ runtime: 'bun' }),
      process.env.CYPRESS ? react() : reactRouter(),
      tsconfigPaths(),
      sentryReactRouter(
        {
          org: sentryConfig.org,
          project: sentryConfig.project,
          authToken: sentryConfig.authToken,
          release: { name: sentryConfig.release },
        },
        config
      ),
    ],
    build: {
      chunkSizeWarningLimit: 1000, // Increase size limit to 1000kb
      target: 'esnext', // Compiles to modern JavaScript features for latest browsers
      sourcemap: sentryConfig.isSourcemapEnabled ? 'hidden' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // Splits heavy vendor packages into stable chunks so feature
            // changes don't invalidate the entire JS payload for repeat visits.
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-datum-ui': ['@datum-cloud/datum-ui'],
            'vendor-recharts': ['recharts'],
            'vendor-icons': ['lucide-react'],
            'vendor-streamdown': ['streamdown'], // pulls mermaid, elk, shiki — ~5MB
          },
        },
      },
    },
  };
});
