import { sentryConfig } from './app/utils/config/sentry.config';
import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Workaround for issue with running react router in a production build
//
// See: https://github.com/remix-run/react-router/issues/12568#issuecomment-2629986004

export default defineConfig((config) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const aliases: { [key: string]: string } = {
    '@': resolve(__dirname, './app'),
  };

  if (isProduction) {
    aliases['react-dom/server'] = 'react-dom/server.node';
  }

  return {
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
    plugins: [
      tailwindcss(),
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
    },
  };
});
