import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const aliases: { [key: string]: string } = {
  '@': resolve(__dirname, './app'),
}

// Workaround for issue with running react router in a production build
//
// See: https://github.com/remix-run/react-router/issues/12568#issuecomment-2629986004
if (process.env.NODE_ENV == 'production') {
  aliases['react-dom/server'] = 'react-dom/server.node'
}

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  server: {
    port: 3000,
  },
  ssr: {
    optimizeDeps: {
      include: ['react-dom/server.node'],
    },
  },
  assetsInclude: ['**/*.woff2'], // Add font formats you're using
  plugins: [
    tailwindcss(),
    process.env.CYPRESS ? react() : reactRouter(),
    tsconfigPaths(),
  ],
  /**
   * Build configuration for optimizing bundle size and performance
   *
   * Key features:
   * 1. Increased chunk size warning limit to 1000kb to accommodate larger vendor bundles
   *
   * Benefits:
   * - Improved caching: Vendor dependencies cached separately from application code
   * - Better load performance: Parallel loading of smaller chunks
   * - Reduced main bundle size: Dependencies split into separate chunks
   * - More efficient updates: Only changed chunks need to be downloaded
   */
  build: {
    chunkSizeWarningLimit: 1000, // Increase size limit to 1000kb
    target: 'esnext', // Compiles to modern JavaScript features for latest browsers
  },
})
