import { defineConfig } from 'cypress';
import 'dotenv/config';

// Set environment variables for test mode before any app code loads
process.env.CYPRESS = 'true';
process.env.NODE_ENV = 'test';

export default defineConfig({
  env: {
    CYPRESS: 'true',
    APP_URL: 'http://localhost:3000',
    AUTH_OIDC_ISSUER: process.env.AUTH_OIDC_ISSUER || 'http://localhost:3000',
    AUTH_OIDC_CLIENT_ID: process.env.AUTH_OIDC_CLIENT_ID,
  },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    // Disable web security to allow cross-origin navigation (needed for OIDC redirects)
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);

          return null;
        },
        signSessionCookie(sessionData: { accessToken: string; expiredAt: string; sub: string }) {
          // Import React Router's cookie utilities to sign the cookie properly
          const { createCookie, createCookieSessionStorage } = require('react-router');
          const sessionSecret =
            process.env.SESSION_SECRET || 'test-session-secret-minimum-32-chars-for-testing';

          const sessionCookie = createCookie('_session', {
            path: '/',
            sameSite: 'lax',
            httpOnly: true,
            maxAge: 60 * 60 * 13, // 13 hours
            secrets: [sessionSecret],
            secure: false, // Allow insecure cookies in test
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
    experimentalStudio: true,
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
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
