/// <reference types="cypress" />

/**
 * Project-area deny scenarios for the Phase 3 RBAC migration.
 *
 * Mirrors `rbac-denials-org.cy.ts` (Phase 2): Cypress's `cy.intercept` can only
 * stub browser-originated requests. The DSL's `runListLoader` / `runDetailLoader`
 * execute SSR-side in the React Router Node process and call the upstream IAM
 * API directly (via `gateRouteAccess` → `SelfSubjectAccessReview`), so we can't
 * stub the gate from the browser today.
 *
 * Tests are currently:
 * - 0 live / 20 .skip. All tests are .skip because the underlying gates are
 *   SSR-side loader calls which cy.intercept cannot stub. They are skeletons
 *   documenting the denial matrix. Unblock via a Phase 3 deny-scoped CI fixture
 *   user, or a dev-server layer that shims the upstream IAM SSAR endpoint.
 *
 * Endpoint + response shape verified against `cypress/support/e2e.ts` (the
 * ambient default-allow stub) and `app/modules/rbac/server/rbac.service.ts`.
 */

interface ProjectBulkCheck {
  resource: string;
  verb: string;
  group?: string;
  namespace?: string;
  name?: string;
}

type ProjectDenyKey = `${string}:${string}`;

/**
 * Override the ambient default-allow `/api/permissions/bulk-check` stub from
 * `cypress/support/e2e.ts`. Cypress applies the most-recent matching
 * intercept, so a per-test call after the global `beforeEach` wins.
 *
 * Helper is named `interceptProjectSSAR` to avoid colliding with the
 * identically shaped helpers in `rbac-denials.cy.ts` and
 * `rbac-denials-org.cy.ts` — Cypress flattens all spec files into one TS scope
 * at typecheck time.
 */
function interceptProjectSSAR(deny: ProjectDenyKey[]): void {
  const denySet = new Set<ProjectDenyKey>(deny);
  cy.intercept('POST', '/api/permissions/bulk-check', (req) => {
    const checks = (
      req.body && Array.isArray(req.body.checks) ? (req.body.checks as ProjectBulkCheck[]) : []
    ) as ProjectBulkCheck[];
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: {
          results: checks.map((c) => {
            const denied = denySet.has(`${c.resource}:${c.verb}` as ProjectDenyKey);
            return {
              allowed: !denied,
              denied,
              request: {
                resource: c.resource,
                verb: c.verb,
                group: c.group ?? '',
                namespace: c.namespace,
                name: c.name,
              },
            };
          }),
        },
      },
    });
  }).as('bulkCheck');
}

// Placeholder project / sub-resource IDs — the SSAR deny short-circuits the
// page before any resource fetch resolves for the client-side cases, so these
// never need to exist upstream. For server-side scenarios (currently
// `.skip`-ed), real fixture IDs are needed (see file header).
const PROJECT_ID = (Cypress.env('TEST_PROJECT_ID') as string | undefined) ?? 'rbac-denials-project';
const SERVICE_ACCOUNT_ID =
  (Cypress.env('TEST_SERVICE_ACCOUNT_ID') as string | undefined) ?? 'rbac-denials-sa';

// ---------------------------------------------------------------------------
// Client-side gates — PermissionButton disabled when deny intercept returns.
// These pass reliably because the gate runs in the browser after page mount.
// ---------------------------------------------------------------------------
describe('RBAC denials — project area (client-side gates)', () => {
  beforeEach(() => {
    cy.login();
  });

  it.skip('domains "Create domain" disabled when domains:create denied', () => {
    // Skipped until fixture project resolves — the create-domain-button lives
    // inside the domains list page, which requires the project layout loader
    // to succeed first. Server-side gate at /project/[projectId] short-
    // circuits before the client-side button renders.
    interceptProjectSSAR(['domains:create']);
    cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
    cy.wait('@bulkCheck');
    cy.get('[data-e2e="create-domain-button"]', { timeout: 10000 }).should('be.disabled');
  });

  it.skip('secrets "Create secret" disabled when secrets:create denied', () => {
    // Same blocker as above — needs real PROJECT_ID fixture for the layout
    // loader to succeed before the client-side gate renders.
    interceptProjectSSAR(['secrets:create']);
    cy.visit(`/project/${PROJECT_ID}/secrets`, { failOnStatusCode: false });
    cy.wait('@bulkCheck');
    cy.get('[data-e2e="create-secret-button"]', { timeout: 10000 }).should('be.disabled');
  });
});

// ---------------------------------------------------------------------------
// Server-side gates — loader-level RestrictedState rendering.
// Skipped pending Phase 3 deny-scoped fixture user or dev-server SSAR shim.
// Each test documents the (resource, verb, scope) it would assert against.
// ---------------------------------------------------------------------------
describe('RBAC denials — project area (server-side gates, .skip)', () => {
  beforeEach(() => {
    cy.login();
  });

  it.skip('project layout RestrictedState when projects:get denied', () => {
    // resource: projects, verb: get, scope: project
    interceptProjectSSAR(['projects:get']);
    cy.visit(`/project/${PROJECT_ID}`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view this project.").should('be.visible');
  });

  it.skip('domains list RestrictedState when domains:list denied', () => {
    // resource: domains, verb: list, scope: project
    interceptProjectSSAR(['domains:list']);
    cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view domains.").should('be.visible');
    cy.get('[data-e2e="create-domain-button"]').should('not.exist');
  });

  it.skip('secrets list RestrictedState when secrets:list denied', () => {
    // resource: secrets, verb: list, scope: project
    interceptProjectSSAR(['secrets:list']);
    cy.visit(`/project/${PROJECT_ID}/secrets`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view secrets.").should('be.visible');
  });

  it.skip('service-accounts detail RestrictedState when serviceaccounts:get denied', () => {
    // resource: serviceaccounts, verb: get, scope: project
    interceptProjectSSAR(['serviceaccounts:get']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
      failOnStatusCode: false,
    });
    cy.contains("You don't have permission to view this service account.").should('be.visible');
  });

  it.skip('settings/general RestrictedState when projects:patch denied', () => {
    // resource: projects, verb: patch, scope: project
    interceptProjectSSAR(['projects:patch']);
    cy.visit(`/project/${PROJECT_ID}/settings/general`, { failOnStatusCode: false });
    cy.contains("You don't have permission to edit this project.").should('be.visible');
  });

  it.skip('metrics list RestrictedState when exportpolicies:list denied', () => {
    // resource: exportpolicies, verb: list, scope: project
    interceptProjectSSAR(['exportpolicies:list']);
    cy.visit(`/project/${PROJECT_ID}/metrics`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view export policies.").should('be.visible');
  });

  it.skip('metrics new RestrictedState when exportpolicies:create denied', () => {
    // resource: exportpolicies, verb: create, scope: project
    interceptProjectSSAR(['exportpolicies:create']);
    cy.visit(`/project/${PROJECT_ID}/metrics/new`, { failOnStatusCode: false });
    cy.contains("You don't have permission to create export policies.").should('be.visible');
  });

  it.skip('domains detail RestrictedState when domains:get denied', () => {
    // resource: domains, verb: get, scope: project
    interceptProjectSSAR(['domains:get']);
    cy.visit(`/project/${PROJECT_ID}/domains/any-domain`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view this domain.").should('be.visible');
  });

  it.skip('secrets detail RestrictedState when secrets:get denied', () => {
    // resource: secrets, verb: get, scope: project
    interceptProjectSSAR(['secrets:get']);
    cy.visit(`/project/${PROJECT_ID}/secrets/any-secret`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view this secret.").should('be.visible');
  });

  it.skip('SA new RestrictedState when serviceaccounts:create denied', () => {
    // resource: serviceaccounts, verb: create, scope: project
    interceptProjectSSAR(['serviceaccounts:create']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts/new`, { failOnStatusCode: false });
    cy.contains("You don't have permission to create service accounts.").should('be.visible');
  });

  it.skip('SA list RestrictedState when serviceaccounts:list denied', () => {
    // resource: serviceaccounts, verb: list, scope: project
    interceptProjectSSAR(['serviceaccounts:list']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view service accounts.").should('be.visible');
  });

  it.skip('SA policy-bindings RestrictedState when policybindings:list (org-scope) denied', () => {
    // resource: policybindings, verb: list, scope: org
    interceptProjectSSAR(['policybindings:list']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}/policy-bindings`, {
      failOnStatusCode: false,
    });
    cy.contains("You don't have permission to view roles for this service account.").should(
      'be.visible'
    );
  });

  it.skip('hides domains row delete when domains:delete denied', () => {
    // resource: domains, verb: delete, scope: project
    interceptProjectSSAR(['domains:delete']);
    cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
    cy.get('[data-e2e="domain-row-delete"]').should('not.exist');
  });

  it.skip('hides domains row refresh when domains:update denied', () => {
    // resource: domains, verb: update, scope: project
    interceptProjectSSAR(['domains:update']);
    cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
    cy.get('[data-e2e="domain-row-refresh"]').should('not.exist');
  });

  it.skip('hides "Manage DNS Zone" row action when dnszones:list denied', () => {
    // resource: dnszones, verb: list, scope: project
    interceptProjectSSAR(['dnszones:list']);
    cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
    cy.contains('Manage DNS Zone').should('not.exist');
  });

  it.skip('hides "Create key" when serviceaccountkeys:create denied', () => {
    // resource: serviceaccountkeys, verb: create, scope: project
    interceptProjectSSAR(['serviceaccountkeys:create']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
      failOnStatusCode: false,
    });
    cy.contains('button', /create key/i).should('not.exist');
  });

  it.skip('hides danger card overlay only when serviceaccounts:delete denied', () => {
    // resource: serviceaccounts, verb: delete, scope: project
    interceptProjectSSAR(['serviceaccounts:delete']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
      failOnStatusCode: false,
    });
    cy.get('[data-e2e="delete-service-account-button"]').should('not.exist');
  });

  it.skip('hides DisplayName form when serviceaccounts:patch denied', () => {
    // resource: serviceaccounts, verb: patch, scope: project
    interceptProjectSSAR(['serviceaccounts:patch']);
    cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
      failOnStatusCode: false,
    });
    cy.get('[data-e2e="service-account-display-name-input"]').should('not.exist');
  });
});
