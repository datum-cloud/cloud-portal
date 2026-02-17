import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import '@testing-library/cypress/add-commands';

Cypress.Commands.add(
  'login',
  (options?: { accessToken?: string; sub?: string }) => {
    // Get accessToken and sub from options or environment variables
    cy.env(['ACCESS_TOKEN', 'SUB']).then((env) => {
      const accessToken = options?.accessToken ?? env.ACCESS_TOKEN;
      const sub = options?.sub ?? env.SUB;

      if (!accessToken) {
        throw new Error('accessToken is required. Provide it via options or ACCESS_TOKEN environment variable.');
      }
      if (!sub) {
        throw new Error('sub is required. Provide it via options or SUB environment variable.');
      }

      // Create a unique session ID based on accessToken and sub
      const sessionId = `session-${accessToken.substring(0, 20)}-${sub}`;

      cy.session(
        sessionId,
        () => {
          const baseUrl = Cypress.config('baseUrl');
          if (!baseUrl) {
            throw new Error('baseUrl is required in Cypress configuration');
          }
          const url = new URL(baseUrl);
          const domain = url.hostname;
          const isSecure = url.protocol === 'https:';

          // Build session object and sign it
          const now = new Date();
          const expiredAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // Now + 12 hours

          const sessionData = {
            accessToken,
            expiredAt: expiredAt.toISOString(),
            sub,
          };

          // Sign the cookie using React Router's signing mechanism
          cy.task<string>('signSessionCookie', sessionData).then((signedCookieValue) => {
            if (!signedCookieValue) {
              throw new Error('Failed to sign session cookie');
            }

            cy.setCookie('_session', signedCookieValue, {
              httpOnly: true,
              secure: isSecure,
              path: '/',
              sameSite: 'lax',
              domain: domain,
            });
          });
        },
        {
          validate: () => {
            cy.request({
              url: `${Cypress.config('baseUrl')}${paths.account.organizations.root}`,
              failOnStatusCode: false,
            }).then((response) => {
              if (response.status !== 200) {
                throw new Error('Session validation failed');
              }
            });
          },
          cacheAcrossSpecs: true,
        }
      );
    });
  }
);

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  // returning false here prevents Cypress from failing the test
  console.error('Uncaught exception:', err.message);
  return false;
});

// Aggressively prevent any parent window navigation
// This runs before every page load to protect the Cypress UI window
Cypress.on('window:before:load', (win) => {
  try {
    // Override window.top to always return the current window
    const originalTop = win.top;
    Object.defineProperty(win, 'top', {
      get: () => win,
      set: () => {
        console.warn('[Cypress] Blocked attempt to set window.top');
      },
      configurable: false,
    });

    // Override window.parent similarly
    Object.defineProperty(win, 'parent', {
      get: () => win,
      set: () => {
        console.warn('[Cypress] Blocked attempt to set window.parent');
      },
      configurable: false,
    });

    // Prevent location changes on window.top
    if (originalTop && originalTop !== win) {
      try {
        Object.defineProperty(originalTop, 'location', {
          get: () => win.location,
          set: () => {
            console.warn('[Cypress] Blocked attempt to redirect parent window');
          },
          configurable: false,
        });
      } catch (e) {
        // May fail due to cross-origin restrictions, which is fine
        console.warn('[Cypress] Could not override parent.location (cross-origin):', e);
      }
    }
  } catch (e) {
    console.warn('[Cypress] Could not override window properties:', e);
  }
});

/**
 * Get the personal org ID from shared state
 * This should be called after the org-list test has run and stored the ID
 * If not already stored, it will fetch it from the organizations page
 */
Cypress.Commands.add('getPersonalOrgId', (): Cypress.Chainable<string> => {
  // First try to get from Cypress.env (set by org-list test)
  const storedId = Cypress.env('personalOrgId') as string | undefined;
  if (storedId) {
    return cy.wrap(storedId, { log: false });
  }

  // If not in env, fetch it from the page
  cy.visit(paths.account.organizations.root);
  return cy
    .get('[data-e2e="organization-card-personal"]')
    .should('be.visible')
    .find('[data-e2e="organization-card-id-copy"]')
    .should('be.visible')
    .first()
    .invoke('text')
    .then((orgId: string) => {
      const trimmedId = orgId.trim();
      if (!trimmedId) {
        throw new Error('Failed to extract personal org ID from page');
      }
      Cypress.env('personalOrgId', trimmedId);
      return trimmedId;
    })
    .then((orgId: string) => cy.wrap(orgId, { log: false })) as Cypress.Chainable<string>;
});

/**
 * Get the project ID from shared state
 * This should be called after the project-list test has run and stored the ID
 * If not already stored, it will fetch it from the projects page
 */
Cypress.Commands.add('getProjectId', (orgId?: string): Cypress.Chainable<string> => {
  // First try to get from Cypress.env (set by project-list test)
  const storedId = Cypress.env('projectId') as string | undefined;
  if (storedId) {
    return cy.wrap(storedId, { log: false });
  }

  // If not in env, fetch it from the page
  // If orgId is provided, use it; otherwise get personal org ID
  const fetchProjectId = (targetOrgId: string) => {
    cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId: targetOrgId }));
    return cy
      .get('[data-e2e="project-card"]')
      .should('be.visible')
      .first()
      .find('[data-e2e="project-card-id-copy"]')
      .should('be.visible')
      .invoke('text')
      .then((projectId: string) => {
        const trimmedId = projectId.trim();
        if (!trimmedId) {
          throw new Error('Failed to extract project ID from page');
        }
        Cypress.env('projectId', trimmedId);
        return trimmedId;
      })
      .then((projectId: string) => cy.wrap(projectId, { log: false }));
  };

  if (orgId) {
    return fetchProjectId(orgId) as Cypress.Chainable<string>;
  }

  return cy.getPersonalOrgId().then((personalOrgId) => {
    return fetchProjectId(personalOrgId);
  }) as Cypress.Chainable<string>;
});

// TypeScript declarations for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login command that sets the _session cookie and caches authentication state using cy.session()
       * Session token is always built dynamically from accessToken and sub.
       * Values can be provided via options or environment variables (ACCESS_TOKEN, SUB).
       * @param options - Optional object with accessToken and sub properties
       * @example cy.login()
       * @example cy.login({ accessToken: 'token', sub: 'user-id' })
       */
      login(options?: { accessToken?: string; sub?: string }): Chainable<void>;

      /**
       * Get the personal org ID from shared state
       * @example cy.getPersonalOrgId().then((orgId) => { cy.visit(`/org/${orgId}`); })
       */
      getPersonalOrgId(): Chainable<string>;

      /**
       * Get the project ID from shared state
       * @param orgId - Optional org ID to use when fetching project ID (defaults to personal org ID)
       * @example cy.getProjectId().then((projectId) => { cy.visit(`/project/${projectId}`); })
       */
      getProjectId(orgId?: string): Chainable<string>;
    }
  }
}
