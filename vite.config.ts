import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  resolve:
    process.env.NODE_ENV === 'development'
      ? {}
      : {
          alias: {
            'react-dom/server': 'react-dom/server.node',
          },
        },
  server: {
    port: 3000,
  },
  ssr: {
    optimizeDeps: {
      include: ['react-dom/server.node'],
    },
  },
  plugins: [
    tailwindcss(),
    process.env.CYPRESS ? react() : reactRouter(),
    tsconfigPaths(),
    reactRouterHonoServer({
      runtime: 'bun',
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000, // Increase size limit to 1000kb
    target: 'esnext', // Compiles to modern JavaScript features for latest browsers
  },
});
