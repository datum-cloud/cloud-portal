import { sentryConfig } from './app/utils/config/sentry.config.ts';
import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import type { Plugin, PluginOption, UserConfig } from 'vite';
import { defineConfig } from 'vite';

// Replace server-only modules transitively imported by `defineResourceRoute`
// with browser-safe no-ops when bundling for Cypress component tests. The
// real modules either pull in `prom-client` (crashes on `process.env.NODE_DEBUG`
// in the browser) or call `process.exit` at module load. Component specs that
// import `defineResourceRoute` never actually invoke the loader — they replace
// it at the memory-router level — so the stubs only need to keep module load
// from crashing. Production builds are unaffected.
function stubServerModulesForCypress(): Plugin {
  const stubs: Record<string, string> = {
    [resolve(import.meta.dirname, './app/modules/rbac/server/check-permission.ts')]: `
      export async function canInLoader() { return true; }
      export async function gateRouteAccess() { return true; }
    `,
    [resolve(import.meta.dirname, './app/utils/env/env.server.ts')]: `
      export const env = {
        public: {},
        server: {},
      };
      export const isProduction = false;
      export const isDevelopment = false;
      export const isTest = true;
    `,
    // The `@/utils/cookies` barrel re-exports a dozen `.server.ts` files,
    // most of which create real cookie storage at module-init time and crash
    // in the browser. Stub the barrel itself with just the symbols
    // `defineResourceRoute` actually uses (`redirectWithToast`).
    [resolve(import.meta.dirname, './app/utils/cookies/index.ts')]: `
      export async function redirectWithToast() { return new Response(null); }
    `,
  };
  return {
    name: 'stub-server-modules-for-cypress',
    enforce: 'pre',
    load(id) {
      return stubs[id] ?? null;
    },
  };
}

export default defineConfig(async (config): Promise<UserConfig> => {
  const isCypress = !!process.env.CYPRESS;
  const aliases: { [key: string]: string } = {
    '@': resolve(import.meta.dirname, './app'),
  };

  // The `stubServerModulesForCypress` plugin (registered below when CYPRESS
  // is set) rewrites the server-only modules transitively imported by
  // `defineResourceRoute` so component specs don't drag prom-client,
  // env.server, or cookie-store init code into the browser bundle.

  return {
    resolve: {
      alias: aliases,
      tsconfigPaths: true,
    },
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      // .devenv/ holds the local kwok cluster's etcd/log state (Tier 1 plugin
      // dev registry), which writes continuously while task devenv:portal is
      // running. Without this, Vite's watcher treats those writes as source
      // changes and triggers a full-reload loop.
      watch: {
        ignored: ['**/.devenv/**'],
      },
    },
    optimizeDeps: {
      include: [
        // Pre-bundle all datum-ui subpath exports so navigating to a route
        // that pulls in a not-yet-seen component doesn't trigger a re-optimize
        // + full page reload in dev.
        '@datum-cloud/datum-ui/*',
        // The * glob only matches one level — deep subpaths must be listed
        // explicitly or their late discovery triggers a mid-session
        // re-optimize (504 Outdated Optimize Dep + a second react-router
        // module instance breaking Router context).
        '@datum-cloud/datum-ui/form/adapters/conform',
        '@datum-cloud/datum-ui/form/stepper',
        'nuqs/adapters/react-router/v8',
        'remix-utils/csrf/react',
        'recharts',
        'class-variance-authority',
        'd3-geo',
        'cobe',
        'nuqs',
        'motion/react',
      ],
    },
    ssr: {
      optimizeDeps: {
        include: ['react-dom/server.node'],
      },
      // nuqs imports react-router hooks. Left external in dev SSR, Bun's
      // native resolution picks react-router's `production` conditional dist
      // while the app tree (Vite module runner) uses `development` — two
      // module instances, so nuqs's useNavigate() lands outside the Router
      // context. Bundling nuqs through the runner keeps one instance. The
      // react-router CLI avoids this with --conditions=development, but our
      // dev server is hono-server on Bun, which doesn't set it.
      noExternal: ['nuqs'],
    },
    plugins: [
      ...(isCypress ? [stubServerModulesForCypress()] : []),
      tailwindcss(),
      reactRouterHonoServer({ runtime: 'bun' }),
      isCypress ? react() : reactRouter(),
      sentryReactRouter(
        {
          org: sentryConfig.org,
          project: sentryConfig.project,
          authToken: sentryConfig.authToken,
          release: { name: sentryConfig.release },
        },
        config
      ) as PluginOption,
    ],
    build: {
      chunkSizeWarningLimit: 1000, // Increase size limit to 1000kb
      target: 'esnext', // Compiles to modern JavaScript features for latest browsers
      sourcemap: sentryConfig.isSourcemapEnabled ? 'hidden' : false,
      // rolldown (Vite 8) replaces rollupOptions/manualChunks. Object-form
      // manualChunks is rejected by the compat layer; codeSplitting groups are
      // the supported equivalent. cypress-vite bundles each spec with
      // inlineDynamicImports, which conflicts with chunk grouping — only apply
      // vendor grouping for the real app build, never for Cypress spec bundling.
      rolldownOptions: {
        output: isCypress
          ? {}
          : {
              codeSplitting: {
                groups: [
                  // Splits heavy vendor packages into stable chunks so feature
                  // changes don't invalidate the entire JS payload for repeat visits.
                  { name: 'vendor-react', test: /node_modules\/(react|react-dom|react-router)\// },
                  { name: 'vendor-datum-ui', test: /node_modules\/@datum-cloud\/datum-ui\// },
                  { name: 'vendor-recharts', test: /node_modules\/recharts\// },
                  { name: 'vendor-icons', test: /node_modules\/lucide-react\// },
                  { name: 'vendor-streamdown', test: /node_modules\/streamdown\// }, // pulls mermaid, elk, shiki — ~5MB
                ],
              },
            },
      },
    },
  };
});
