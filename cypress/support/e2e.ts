import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import '@testing-library/cypress/add-commands';

Cypress.Commands.add(
  'login',
  (
    sessionToken: string = 'eyJfc2Vzc2lvbiI6eyJhY2Nlc3NUb2tlbiI6ImV5SmhiR2NpT2lKU1V6STFOaUlzSW10cFpDSTZJak0xT1RJMk1USTNNamczTURRNE5qVXpPQ0lzSW5SNWNDSTZJa3BYVkNKOS5leUpoZFdRaU9sc2lNek15TWpBNU16VXdOVEl6TWprd05qVXhJaXdpTXpJNE5EUTVNamc1TnpZeU1UZ3hNVE16SWl3aU16VXhOalF4TlRVMU1UVXdNemMxTkRVNElpd2lNekkxT0RRNE9UQTBNVEk0TURjek56VTBJaXdpTXpJMU9EUTRPVEF6TWpjeU5ETTFOek00SWl3aU16STFPRFE0T1RBd09UUXdNek0zTVRjNElsMHNJbU5zYVdWdWRGOXBaQ0k2SWpNeU5UZzBPRGt3TXpJM01qUXpOVGN6T0NJc0ltVnRZV2xzSWpvaWJXcGxibXRwYm5OdmJpdDBaWE4wUUdSaGRIVnRMbTVsZENJc0ltVjRjQ0k2TVRjM01EWTRNems1Tml3aWFXRjBJam94Tnpjd05qUXdOemsyTENKcGMzTWlPaUpvZEhSd2N6b3ZMMkYxZEdndWMzUmhaMmx1Wnk1bGJuWXVaR0YwZFcwdWJtVjBJaXdpYW5ScElqb2lWakpmTXpVNU1qYzFNelE1T1RJM056azROemsxTFdGMFh6TTFPVEkzTlRNME9Ua3lOemcyTkRNek1TSXNJbTVpWmlJNk1UYzNNRFkwTURjNU5pd2ljM1ZpSWpvaU16VTVNalUyT0RnMU56UTFPVFV4TWpRNEluMC5OYUMwdmIxU18yRGNVLXZGOV9EbFJGVEVsdFFxRDJVN3FCbG9MaVpZRkhkeEpDX1UxSVpRNy1HODMwbEZoOThqSGlCUXQxZ3lzaVNVZXpVQjFKcHlWWjhZSTFybV9JQVlEU3h5bzZKVUlmYnNnUllSeXY3aXJrb1pmd3ZpWWNyQk8xRk9lS2VjOUliYWdmZF9xbHRRT1djYVZvSzdrR2NucWd0aEEzcXNpd3lINmkwWlJEempuR0ZUUzBfZWszY181S29NR2ZhdF9LenhfNUd5OVZtZkJWNmlKNUVYQzhPSEU0R2txQVRBXy1XT1pJcnBwQnFKN3lVWThsODJ2bmVkamtkbjJzcHBGOGdndjJCOThTZkYza2RTckVERmFBeWJDLUFvMnhIbnBiOGRnQkFiOVdhZWFnaU1BNTFYZGVrZ0kzSHJpTlZMaHhjODZRN2I5bkJ0SHciLCJleHBpcmVkQXQiOiIyMDI2LTAyLTEwVDAwOjM5OjU1LjE4NFoiLCJzdWIiOiIzNTkyNTY4ODU3NDU5NTEyNDgifX0=.92OHIQSoWsAbds2QZReazHohL7DIf7u8bYCvOlRn41c'
  ) => {
    cy.session(
      sessionToken, // Session ID - unique per session token
      () => {
        const baseUrl = Cypress.config('baseUrl') || 'http://localhost:3000';
        const url = new URL(baseUrl);

        // Set the _session cookie with all attributes matching production
        // Extract domain from baseUrl (remove port if present)
        const domain = url.hostname;
        const isSecure = url.protocol === 'https:';

        cy.setCookie('_session', sessionToken, {
          httpOnly: true,
          secure: isSecure,
          path: '/',
          sameSite: 'lax',
          domain: domain,
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
       * @param sessionToken - The session token to set as the _session cookie (optional, has default)
       * @example cy.login()
       * @example cy.login('your-session-token-here')
       */
      login(sessionToken?: string): Chainable<void>;

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
