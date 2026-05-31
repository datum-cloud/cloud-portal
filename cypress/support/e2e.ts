import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import '@testing-library/cypress/add-commands';

/**
 * Stub the "ambient" authenticated-page polling that fires on every visit so
 * the e2e suite doesn't trip the upstream IAM rate limiter for the test
 * account. None of the smoke specs exercise these endpoints — they're noise
 * from global header components (notification bell, watch SSE, org switcher,
 * marker.io feedback widget).
 *
 * Without this, every `cy.visit` opens a fresh QueryClient + WatchManager
 * that hammers IAM, and in CI — where specs run back-to-back against the
 * same test account — the cumulative load returns 429s. The user-visible
 * symptom is a "Too Many Requests" toast on whatever spec runs latest in
 * the suite (most often the alphabetically-last `secrets.cy.ts`).
 *
 * Specs that genuinely exercise one of these endpoints can override the
 * intercept locally (later `cy.intercept` calls for the same route win) or
 * disable the helper entirely via `Cypress.env('E2E_ALLOW_AMBIENT_APIS')`.
 */
function stubAmbientApis(): void {
  // Notification bell — user-scoped invitation list.
  // Scoped tightly to `users/me/...userinvitations` so the org-scoped
  // invitation tables (covered by `members.cy.ts`) are unaffected.
  cy.intercept('GET', '**/users/me/**/userinvitations*', {
    statusCode: 200,
    body: {
      kind: 'UserInvitationList',
      apiVersion: 'iam.miloapis.com/v1alpha1',
      items: [],
    },
  });

  // Multiplexed watch SSE. We can't easily simulate a real SSE stream from
  // `cy.intercept`, so we hold the request open longer than any test could
  // run. The client-side WatchManager sits awaiting `fetch` and never enters
  // its retry loop, never opens upstream K8s watches, and never reconnects.
  cy.intercept('GET', '/api/watch/stream*', {
    statusCode: 200,
    headers: { 'content-type': 'text/event-stream' },
    body: '',
    delay: 5 * 60 * 1000,
  });
  cy.intercept('POST', '/api/watch/subscribe', { statusCode: 200, body: {} });
  cy.intercept('POST', '/api/watch/unsubscribe', { statusCode: 200, body: {} });

  // Marker.io feedback widget — third-party, not under test.
  cy.intercept(/api\.marker\.io/, { statusCode: 204, body: '' });

  // RBAC access-review BFF (#1269). Every authenticated page fires one or
  // both of these on mount; when they resolve, components re-render to
  // reflect computed permission state. In the regression suite that lands
  // mid-`cy.click()` on action buttons in `before all` hooks (most often
  // `create-organization-button` and `create-project-button`), detaching
  // the element and producing the "page updated while this command was
  // executing" error.
  //
  // We default-allow for the regression user. Specs that legitimately test
  // permission denial can override these intercepts locally — later
  // `cy.intercept` calls for the same route win.
  cy.intercept('POST', '/api/permissions/check', {
    statusCode: 200,
    body: { success: true, data: { allowed: true, denied: false } },
  });
  cy.intercept('POST', '/api/permissions/bulk-check', (req) => {
    const checks = (req.body && Array.isArray(req.body.checks) ? req.body.checks : []) as Array<
      Record<string, unknown>
    >;
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: {
          results: checks.map((c) => ({
            allowed: true,
            denied: false,
            request: c,
          })),
        },
      },
    });
  });
}

beforeEach(() => {
  if (!Cypress.env('E2E_ALLOW_AMBIENT_APIS')) {
    stubAmbientApis();
  }
});

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
    .get('[data-e2e="organization-card-personal"]', { timeout: 10000 })
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
    .url({ timeout: 30_000 })
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
    cy.url({ timeout: 30_000 }).should(
      'include',
      paths.org.detail.projects.root.replace('[orgId]', orgId)
    );
    cy.get('body', { timeout: 30_000 }).then(($body) => {
      const hasToolbarCreate = $body.find('[data-e2e="create-project-button"]').length > 0;
      if (hasToolbarCreate) {
        // create-project-button is a PermissionButton: while the projects:create
        // permission check is in flight it renders disabled (wrapped in a Tooltip),
        // then swaps to a bare, enabled button once the check resolves. Clicking
        // before the check settles detaches the node mid-click ("page updated while
        // executing"). Wait for it to become enabled, then re-query and click so the
        // click targets the post-swap, stable node.
        //
        // The 4s Cypress default is not enough headroom for the projects:create
        // access-review in CI — since #1275 widened RBAC fan-out, the check
        // routinely takes 5–10s on shard 3. Use an explicit 30s timeout to
        // ride out the slowdown without masking real failures.
        cy.get('[data-e2e="create-project-button"]', { timeout: 30_000 })
          .should('be.visible')
          .and('not.be.disabled');
        cy.get('[data-e2e="create-project-button"]').click();
        return;
      }

      // Fresh org empty state uses a generic "Create project" button without data-e2e.
      cy.contains('button', /^Create project$/i, { timeout: 30_000 })
        .should('be.visible')
        .and('not.be.disabled');
      cy.contains('button', /^Create project$/i).click();
    });
    cy.get('[data-e2e="create-project-name-input"]').type(displayName);

    // Two slow paths to tolerate on a freshly-created org:
    //
    // 1. The upstream control plane may 403 the create POST for a few seconds
    //    after org creation while the org-owner policy binding propagates to
    //    its authz cache. The PermissionButton's SSAR check (via the BFF) can
    //    return allowed while the real POST is still denied. Retry once on 403.
    //
    // 2. After a successful create, the project may not appear in the LIST
    //    response immediately (control-plane LIST eventual consistency) AND the
    //    org/projects loader runs `gateRouteAccess('projects:list')` — on a new
    //    org that SSAR may still return restricted for a few seconds. We poll
    //    the SSR page HTML directly with `cy.request` (not `cy.reload` + DOM
    //    polling — Cypress run #26713469437 showed that 18 sequential reloads
    //    over 3 minutes all returned 200 but the page DOM stayed blank, so the
    //    UI render race is not the bottleneck). Once the page HTML contains
    //    the displayName, do a single `cy.visit` to render and extract the ID.
    submitCreateAndExpectSuccess(displayName);

    const pageUrl = getPathWithParams(paths.org.detail.projects.root, { orgId });
    pollPageHtmlForDisplayName(pageUrl, displayName, 180_000, 5_000);
    cy.visit(pageUrl);
    return cy
      .contains('[data-e2e="project-card"]', displayName, { timeout: 30_000 })
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
 * Submit the create-project dialog and assert success. On a one-shot 403
 * (RBAC propagation race), wait briefly, re-open the dialog, re-type the
 * name, and resubmit once.
 */
function submitCreateAndExpectSuccess(displayName: string): void {
  cy.intercept('POST', '**/control-plane/**/v1alpha1/projects').as('createProjectReq');
  cy.contains('button', 'Confirm').click();
  cy.wait('@createProjectReq', { timeout: 30_000 }).then((intercept) => {
    const status = intercept.response?.statusCode;
    if (status === 200 || status === 201) return;
    if (status !== 403) {
      throw new Error(`createProjectInOrg: POST failed with ${status}`);
    }
    cy.log('createProjectInOrg: POST got 403 — waiting 10s for RBAC propagation, then retrying');
    cy.wait(10_000, { log: false });
    cy.get('body').then(($body) => {
      if ($body.find('[data-e2e="create-project-button"]').length > 0) {
        cy.get('[data-e2e="create-project-button"]', { timeout: 30_000 })
          .should('not.be.disabled')
          .click();
      } else {
        cy.contains('button', /^Create project$/i, { timeout: 30_000 })
          .should('not.be.disabled')
          .click();
      }
    });
    cy.get('[data-e2e="create-project-name-input"]').clear().type(displayName);
    cy.intercept('POST', '**/control-plane/**/v1alpha1/projects').as('createProjectReqRetry');
    cy.contains('button', 'Confirm').click();
    cy.wait('@createProjectReqRetry', { timeout: 30_000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);
  });
}

/**
 * Poll the SSR-rendered page HTML via `cy.request` until the response body
 * contains the given display name, signaling that the upstream LIST has
 * picked up the newly-created project. This sidesteps the UI render race
 * (CardList / GuardedPage rendering) and tests the upstream list directly.
 *
 * The serialized React Router data is embedded in the page HTML response;
 * a plain substring match against the response body is sufficient and
 * resilient to minor markup churn.
 */
function pollPageHtmlForDisplayName(
  pageUrl: string,
  displayName: string,
  budgetMs: number,
  intervalMs: number
): void {
  cy.request({ url: pageUrl, failOnStatusCode: false, log: false }).then((response) => {
    if (typeof response.body === 'string' && response.body.includes(displayName)) {
      return;
    }

    if (budgetMs <= 0) {
      throw new Error(
        `Project '${displayName}' did not appear in the SSR HTML for ${pageUrl} within the poll budget`
      );
    }

    cy.wait(intervalMs, { log: false });
    pollPageHtmlForDisplayName(pageUrl, displayName, budgetMs - intervalMs, intervalMs);
  });
}

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

      /**
       * Poll the org/projects SSR HTML via `cy.request` until the project's
       * display name is no longer present. Handles the control-plane LIST
       * eventual-consistency window after a project DELETE (the upstream LIST
       * may continue returning the deleted project for a few seconds).
       * @example cy.waitForProjectAbsentInOrg(orgId, testName)
       */
      waitForProjectAbsentInOrg(orgId: string, displayName: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('waitForProjectAbsentInOrg', (orgId: string, displayName: string) => {
  const pageUrl = getPathWithParams(paths.org.detail.projects.root, { orgId });
  pollPageHtmlUntilDisplayNameGone(pageUrl, displayName, 60_000, 3_000);
});

/**
 * Inverse of `pollPageHtmlForDisplayName` — keeps polling the SSR HTML
 * until the response body no longer contains the given display name.
 * Used after DELETE to wait for upstream LIST eventual consistency.
 */
function pollPageHtmlUntilDisplayNameGone(
  pageUrl: string,
  displayName: string,
  budgetMs: number,
  intervalMs: number
): void {
  cy.request({ url: pageUrl, failOnStatusCode: false, log: false }).then((response) => {
    // Only treat the project as gone when the body is a readable string AND
    // does not contain the display name. A non-string body (parsed JSON,
    // unexpected response shape) should fall through to retry — otherwise
    // we'd report success on an unreadable response.
    if (typeof response.body === 'string' && !response.body.includes(displayName)) {
      return;
    }

    if (budgetMs <= 0) {
      throw new Error(
        `Project '${displayName}' still present in SSR HTML for ${pageUrl} after the poll budget`
      );
    }

    cy.wait(intervalMs, { log: false });
    pollPageHtmlUntilDisplayNameGone(pageUrl, displayName, budgetMs - intervalMs, intervalMs);
  });
}
