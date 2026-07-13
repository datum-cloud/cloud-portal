import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Sample Portal Plugin — a Module Federation remote loaded by the cloud-portal
// host at runtime. See README.md and docs/enhancements/portal-plugin-system.md.
//
// The host (cloud-portal) loads this remote via @module-federation/runtime and
// provides react / react-dom / react-router as shared singletons, so the plugin
// renders with the host's exact React and router instance. `shared` below marks
// those as singletons with the host's version so the host copy always wins and
// React is never duplicated (two React instances break hooks).
//
// Assets are fetched server-side by the portal's asset proxy and served under
// /api/plugins/<slug>/…, so plain http://localhost during dev is fine and the
// browser never contacts this origin directly. MF's automatic publicPath makes
// federated chunks resolve relative to remoteEntry.js, which is what lets them
// load correctly through that same-origin proxy prefix.
export default defineConfig({
  server: {
    port: 7777,
    strictPort: true,
    // Allow cross-origin fetches of the manifest/remote during Tier 0/standalone.
    cors: true,
  },
  preview: {
    port: 7777,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'esnext',
    // Keep the sample readable when inspecting the built bundle.
    minify: false,
  },
  plugins: [
    react(),
    federation({
      // MUST equal the manifest `name` — the host keys the remote by this id.
      name: 'sample.miloapis.com',
      // The manifest's `remoteEntry` field points the host at this filename,
      // requested through the asset proxy as /api/plugins/sample/remoteEntry.js.
      filename: 'remoteEntry.js',
      manifest: true,
      // Exposed keys map 1:1 to the manifest's `exposedModules` keys / $codeRefs.
      // The host loads e.g. loadRemote('sample.miloapis.com/SamplePage').
      exposes: {
        './SamplePage': './src/pages/sample-page.tsx',
        './SampleDetail': './src/pages/sample-detail.tsx',
        './SampleHomeCard': './src/cards/sample-home-card.tsx',
        './InstancesList': './src/pages/instances-list.tsx',
        './InstanceDetail': './src/pages/instance-detail.tsx',
        './PlatformData': './src/pages/platform-data.tsx',
      },
      // Host-pinned singletons. requiredVersion tracks the host's majors
      // (react 19, react-router 7, react-query 5). singleton:true guarantees
      // one instance — the host provides all of these, so plugin queries share
      // the host's QueryClient cache.
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router': { singleton: true, requiredVersion: '^7.0.0' },
        '@tanstack/react-query': { singleton: true, requiredVersion: '^5.0.0' },
        // Curated datum-ui subset shared by the host (see the host's
        // federation-host.ts DATUM_UI_SHARED). requiredVersion:false — the
        // host's copy always wins, which is what keeps styling identical to
        // built-in pages; the local install is types + standalone fallback.
        '@datum-cloud/datum-ui/badge': { singleton: true, requiredVersion: false },
        '@datum-cloud/datum-ui/button': { singleton: true, requiredVersion: false },
        '@datum-cloud/datum-ui/card': { singleton: true, requiredVersion: false },
        '@datum-cloud/datum-ui/separator': { singleton: true, requiredVersion: false },
        '@datum-cloud/datum-ui/skeleton': { singleton: true, requiredVersion: false },
        '@datum-cloud/datum-ui/table': { singleton: true, requiredVersion: false },
      },
    }),
  ],
});
