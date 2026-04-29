import { registerSharedResourceTasks } from './cypress/support/shared-resources';
import { defineConfig } from 'cypress';
import cypressSplit from 'cypress-split';
import vitePreprocessor from 'cypress-vite';
import 'dotenv/config';

// Set environment variables for test mode before any app code loads
process.env.CYPRESS = 'true';
process.env.NODE_ENV = 'test';

export default defineConfig({
  env: {
    CYPRESS: 'true',
    APP_URL: process.env.CYPRESS_BASE_URL,
    ACCESS_TOKEN: process.env.ACCESS_TOKEN,
    SUB: process.env.SUB,
  },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      cypressSplit(on, config);

      // Use Vite to bundle E2E specs so cypress shares the app's path-alias
      // resolution (via vite-tsconfig-paths in vite.config.ts). Avoids
      // depending on tsconfig's deprecated `baseUrl`.
      on('file:preprocessor', vitePreprocessor());

      // Shared regression resources (1 org + 1 project per shard)
      registerSharedResourceTasks(on);

      on('task', {
        log(message) {
          console.log(message);

          return null;
        },
        signSessionCookie(sessionData: { accessToken: string; expiredAt: string; sub: string }) {
          // Import React Router's cookie utilities to sign the cookie properly
          const { createCookie, createCookieSessionStorage } = require('react-router');
          const sessionSecret = process.env.SESSION_SECRET;

          const sessionCookie = createCookie('_session', {
            path: '/',
            sameSite: 'lax',
            httpOnly: true,
            maxAge: 60 * 60 * 13, // 13 hours
            secrets: [sessionSecret],
            secure: process.env.NODE_ENV === 'development' ? false : true,
          });

          const sessionStorage = createCookieSessionStorage({
            cookie: sessionCookie,
          });

          // Create a session and commit it to get the signed cookie value
          return sessionStorage
            .getSession()
            .then((session: ReturnType<typeof createCookieSessionStorage>['getSession']) => {
              session.set('_session', sessionData);
              return sessionStorage.commitSession(session);
            })
            .then((cookieHeader: string) => {
              // Extract just the cookie value from the Set-Cookie header
              // Format: "_session=value; Path=/; ..."
              const match = cookieHeader.match(/^_session=([^;]+)/);
              return match ? match[1] : null;
            });
        },
      });

      return config;
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    specPattern: 'cypress/e2e/{smoke,regression}/**/*.{cy,spec}.{js,jsx,ts,tsx}',
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    supportFile: 'cypress/support/component.tsx',
    specPattern: 'cypress/component/**/*.{cy,spec}.{js,jsx,ts,tsx}',
  },
});
