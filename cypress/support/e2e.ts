import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import '@testing-library/cypress/add-commands';

Cypress.Commands.add('login', (options?: { accessToken?: string; sub?: string }) => {
  // Get accessToken and sub from options or environment variables
  cy.env(['ACCESS_TOKEN', 'SUB']).then((env) => {
    const accessToken = options?.accessToken ?? env.ACCESS_TOKEN;
    const sub = options?.sub ?? env.SUB;

    if (!accessToken) {
      throw new Error(
        'accessToken is required. Provide it via options or ACCESS_TOKEN environment variable.'
      );
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
});

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  // returning false here prevents Cypress from failing the test
  console.error('Uncaught exception:', err.message);
  return false;
});

// Aggressively prevent any parent window navigation
// This runs before every page load to protect the Cypress UI window
Cypress.on('window:before:load', (win) => {
  // Optional CI noise reduction: silence browser console.info output.
  // Enable with CYPRESS_E2E_SILENCE_INFO_LOGS=true
  if (Cypress.env('E2E_SILENCE_INFO_LOGS')) {
    win.console.info = () => {};
  }

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
 * Get the personal org ID. Shard-safe: when run in a different process (e.g. cypress-split),
 * Cypress.env is empty, so we fetch from the organizations page instead of relying on cache.
 */
Cypress.Commands.add('getPersonalOrgId', (): Cypress.Chainable<string> => {
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
 * Get the project ID. Shard-safe: when run in a different process (e.g. cypress-split),
 * Cypress.env is empty, so we fetch from the projects page instead of relying on cache.
 */
Cypress.Commands.add('getProjectId', (orgId?: string): Cypress.Chainable<string> => {
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

/**
 * Logout via the UI.
 * Clicks the user menu trigger then the Log Out item.
 * Stubs the /login route to prevent Cypress following the onward OIDC redirect
 * to the external auth provider (which would cause a cross-origin error).
 * After this command resolves, _session cookie will not exist.
 */
Cypress.Commands.add('logout', () => {
  cy.intercept('GET', `${paths.auth.logIn}*`, { statusCode: 200, body: '' }).as(
    '__logoutLoginRedirect'
  );
  cy.get('[data-e2e="user-menu-trigger"]').click();
  cy.get('[data-e2e="user-menu-logout"]').click();
  cy.wait('@__logoutLoginRedirect');
  cy.getCookie('_session').should('not.exist');
});

/**
 * Create a standard org and return its orgId (resource name).
 */
Cypress.Commands.add('createStandardOrg', (displayName: string): Cypress.Chainable<string> => {
  cy.visit(paths.account.organizations.root);
  // Wait for the list to finish its loading → loaded transition before clicking
  // the header action. Otherwise the CardList re-renders mid-click and detaches
  // the button, causing `cy.click()` to fail with "page updated while executing".
  cy.get('[data-e2e="organization-card-personal"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-e2e="create-organization-button"]').should('be.visible').click();
  cy.get('[data-e2e="create-organization-name-input"]', { timeout: 10000 })
    .should('be.visible')
    .type(displayName);
  cy.contains('button', 'Confirm').click();

  return cy
    .url({ timeout: 30000 })
    .should('match', /\/org\/[a-z0-9-]+\//)
    .then((url) => {
      const parsedOrgId = url.split('/org/')[1]?.split('/')[0]?.trim();
      if (!parsedOrgId) {
        throw new Error('Failed to extract created orgId from URL');
      }
      return parsedOrgId;
    })
    .then((parsedOrgId) => cy.wrap(parsedOrgId, { log: false }));
});

/**
 * Create a project in an org and return projectId (resource name).
 */
Cypress.Commands.add(
  'createProjectInOrg',
  (orgId: string, displayName: string): Cypress.Chainable<string> => {
    cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId }));
    cy.url({ timeout: 30000 }).should(
      'include',
      paths.org.detail.projects.root.replace('[orgId]', orgId)
    );
    cy.get('body', { timeout: 30000 }).then(($body) => {
      const hasToolbarCreate = $body.find('[data-e2e="create-project-button"]').length > 0;
      if (hasToolbarCreate) {
        cy.get('[data-e2e="create-project-button"]').should('be.visible').click();
        return;
      }

      // Fresh org empty state uses a generic "Create project" button without data-e2e.
      cy.contains('button', /^Create project$/i, { timeout: 30000 })
        .should('be.visible')
        .click();
    });
    cy.get('[data-e2e="create-project-name-input"]').type(displayName);
    cy.contains('button', 'Confirm').click();

    return cy
      .contains('[data-e2e="project-card"]', displayName, { timeout: 90000 })
      .find('[data-e2e="project-card-id-copy"]')
      .invoke('text')
      .then((projectId: string) => {
        const trimmedId = projectId.trim();
        if (!trimmedId) {
          throw new Error('Created project card found, but project ID badge was empty.');
        }
        return trimmedId;
      })
      .then((trimmedId) => cy.wrap(trimmedId, { log: false }));
  }
);

/**
 * Best-effort project cleanup for regression suites.
 */
Cypress.Commands.add('deleteProjectIfExists', (projectId: string, orgId?: string) => {
  if (!projectId) return;

  cy.visit(getPathWithParams(paths.project.detail.settings.general, { projectId }));
  cy.get('body').then(($body) => {
    if (!$body.find('[data-e2e="delete-project-button"]').length) return;

    cy.get('[data-e2e="delete-project-button"]').click();
    cy.get('body').then(($dialogBody) => {
      if (!$dialogBody.find('[data-e2e="confirmation-dialog-input"]').length) return;
      cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
      cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    });
    if (orgId) {
      cy.url().should('include', paths.org.detail.projects.root.replace('[orgId]', orgId));
    }
  });
});

/**
 * Best-effort org cleanup for regression suites.
 */
Cypress.Commands.add('deleteOrganizationIfExists', (orgId: string) => {
  if (!orgId) return;

  cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId }));
  cy.get('body').then(($body) => {
    if (!$body.find('[data-e2e="delete-organization-button"]').length) return;

    cy.get('[data-e2e="delete-organization-button"]').click();
    cy.get('body').then(($dialogBody) => {
      if (!$dialogBody.find('[data-e2e="confirmation-dialog-input"]').length) return;
      cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
      cy.get('[data-e2e="confirmation-dialog-submit"]').click();
      cy.url().should('include', paths.account.organizations.root);
    });
  });
});

/**
 * Shared regression resources — 1 org + 1 project per Cypress process (shard).
 *
 * Usage in regression specs:
 *   before(() => {
 *     cy.ensureSharedResources().then(({ orgId, projectId }) => { ... });
 *   });
 *
 * The first spec to call this creates the resources; subsequent specs reuse them.
 * Cleanup happens via after:run at the Node level (see shared-resources.ts).
 */
Cypress.Commands.add(
  'ensureSharedResources',
  (): Cypress.Chainable<{ orgId: string; projectId: string }> => {
    return cy
      .task<{
        orgId: string;
        projectId: string;
        timestamp: number;
      } | null>('getSharedResources', null, { log: false })
      .then((existing) => {
        if (existing) {
          return cy.wrap({ orgId: existing.orgId, projectId: existing.projectId }, { log: false });
        }

        // First spec in this shard — create the shared org + project
        const timestamp = Date.now();
        const orgName = `e2e-shared-org-${timestamp}`;
        const projectName = `e2e-shared-project-${timestamp}`;

        cy.login();
        return cy.createStandardOrg(orgName).then((orgId) => {
          return cy.createProjectInOrg(orgId, projectName).then((projectId) => {
            const resources = { orgId, projectId, timestamp };
            return cy.task('setSharedResources', resources, { log: false }).then(() => {
              return cy.wrap({ orgId, projectId }, { log: false });
            });
          });
        });
      }) as Cypress.Chainable<{ orgId: string; projectId: string }>;
  }
);

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

      /**
       * Logout via the UI (user menu → Log Out).
       * Stubs the OIDC redirect so Cypress does not navigate cross-origin.
       * After this resolves, the _session cookie will not exist.
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Create a standard organization and return its resource ID.
       * @example cy.createStandardOrg('e2e-test-org').then((orgId) => { ... })
       */
      createStandardOrg(displayName: string): Chainable<string>;

      /**
       * Create a project in an org and return its resource ID.
       * @example cy.createProjectInOrg(orgId, 'e2e-test-project').then((projectId) => { ... })
       */
      createProjectInOrg(orgId: string, displayName: string): Chainable<string>;

      /**
       * Best-effort cleanup: delete project if it still exists.
       * @example cy.deleteProjectIfExists(projectId, orgId)
       */
      deleteProjectIfExists(projectId: string, orgId?: string): Chainable<void>;

      /**
       * Best-effort cleanup: delete org if it still exists.
       * @example cy.deleteOrganizationIfExists(orgId)
       */
      deleteOrganizationIfExists(orgId: string): Chainable<void>;

      /**
       * Get or create shared regression resources (1 org + 1 project per shard).
       * First call creates them; subsequent calls return the cached IDs.
       * Cleanup is automatic via a global after() hook.
       * @example cy.ensureSharedResources().then(({ orgId, projectId }) => { ... })
       */
      ensureSharedResources(): Chainable<{ orgId: string; projectId: string }>;
    }
  }
}
