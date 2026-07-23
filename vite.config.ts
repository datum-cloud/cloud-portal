import { sentryConfig } from './app/utils/config/sentry.config';
// @react-router/dev/vite calls require("react-router") at module-top-level.
// Under Cypress, tsx intercepts that require() and transforms react-router's
// .mjs chunks via esbuild — react-router 7.18's multi-chunk layout causes
// nested synchronous esbuild Worker calls that trip a re-entrancy guard
// ("Expected id 1 but got id 0"). Dynamic import below skips the load
// entirely when running under Cypress.
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import type { ManualChunksOption } from 'rollup';
import type { Plugin, PluginOption, UserConfig } from 'vite';
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

// Replace server-only modules transitively imported by `defineResourceRoute`
// with browser-safe no-ops when bundling for Cypress component tests. The
// real modules either pull in `prom-client` (crashes on `process.env.NODE_DEBUG`
// in the browser) or call `process.exit` at module load. Component specs that
// import `defineResourceRoute` never actually invoke the loader — they replace
// it at the memory-router level — so the stubs only need to keep module load
// from crashing. Production builds are unaffected.
function stubServerModulesForCypress(): Plugin {
  const stubs: Record<string, string> = {
    [resolve(__dirname, './app/modules/rbac/server/check-permission.ts')]: `
      export async function canInLoader() { return true; }
      export async function gateRouteAccess() { return true; }
    `,
    [resolve(__dirname, './app/utils/env/env.server.ts')]: `
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
    [resolve(__dirname, './app/utils/cookies/index.ts')]: `
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

// Workaround for issue with running react router in a production build
//
// See: https://github.com/remix-run/react-router/issues/12568#issuecomment-2629986004

// Pre-resolve the reactRouter import at module evaluation time so the
// defineConfig callback can remain synchronous (Vite's TS overloads don't
// play well with async callbacks when the plugins array contains Promises).
// When CYPRESS is set, this resolves immediately to null — the import is
// never executed, avoiding the tsx/esbuild re-entrancy crash.
const _reactRouterPromise = process.env.CYPRESS
  ? Promise.resolve(null)
  : import('@react-router/dev/vite');

export default defineConfig(async (config): Promise<UserConfig> => {
  const isCypress = !!process.env.CYPRESS;
  const isProduction = process.env.NODE_ENV === 'production';
  const aliases: { [key: string]: string } = {
    '@': resolve(__dirname, './app'),
  };

  const reactRouterMod = await _reactRouterPromise;
  const reactRouter = reactRouterMod?.reactRouter ?? null;

  // The `stubServerModulesForCypress` plugin (registered below when CYPRESS
  // is set) rewrites the server-only modules transitively imported by
  // `defineResourceRoute` so component specs don't drag prom-client,
  // env.server, or cookie-store init code into the browser bundle.

  return {
    resolve: {
      alias: aliases,
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
      ...(isCypress ? [stubServerModulesForCypress()] : []),
      tailwindcss(),
      reactRouterHonoServer({ runtime: 'bun' }),
      isCypress ? react() : reactRouter!(),
      tsconfigPaths(),
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
      rollupOptions: {
        // cypress-vite bundles each spec with `inlineDynamicImports`, which
        // rollup 4.61+ rejects alongside `manualChunks`. Only apply manual
        // chunking for the real app build, never for Cypress spec bundling.
        output: isCypress
          ? {}
          : {
              manualChunks: {
                // Splits heavy vendor packages into stable chunks so feature
                // changes don't invalidate the entire JS payload for repeat visits.
                'vendor-react': ['react', 'react-dom', 'react-router'],
                'vendor-datum-ui': ['@datum-cloud/datum-ui'],
                'vendor-recharts': ['recharts'],
                'vendor-icons': ['lucide-react'],
                'vendor-streamdown': ['streamdown'], // pulls mermaid, elk, shiki — ~5MB
              } satisfies ManualChunksOption,
            },
      },
    },
  };
});
