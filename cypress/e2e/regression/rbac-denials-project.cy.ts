/// <reference types="cypress" />

/**
 * Project-area deny scenarios for the Phase 3 RBAC migration.
 *
 * `cy.denyPermissions` denies each listed `resource:verb` on both sides of the
 * check: SSR loader gates (`runListLoader` / `runDetailLoader` / `runRouteGate`
 * → `gateRouteAccess` → `RbacService`) read the `e2e-deny` cookie through the
 * test-only hook in `app/modules/rbac/server/e2e-deny.server.ts`, and the
 * browser's `/api/permissions/*` calls hit a matching intercept. Every other
 * check is decided by the real upstream for the regression user.
 *
 * The project is the shard's shared regression project
 * (`cy.ensureSharedResources()`), so the project layout loader resolves.
 * Domain, secret and service-account IDs are placeholders where the route's
 * own detail loader gates before it fetches. Seven cases stay skipped: they
 * assert that a row or detail action is hidden, which needs a real domain or
 * service account that the shared fixture does not seed (on a missing
 * resource the assertion would pass vacuously or the parent layout 404s).
 */

describe('RBAC denials — project area', () => {
  const SERVICE_ACCOUNT_ID = 'rbac-denials-sa';
  let PROJECT_ID = '';

  before(() => {
    cy.ensureSharedResources().then((res) => {
      PROJECT_ID = res.projectId;
    });
  });

  beforeEach(() => {
    cy.login();
  });

  // -------------------------------------------------------------------------
  // Client-side gates — PermissionButton disabled when the bulk check denies.
  // -------------------------------------------------------------------------
  describe('client-side gates', () => {
    it('domains "Create domain" disabled when domains:create denied', () => {
      cy.denyPermissions(['domains:create']);
      cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.contains("You don't have permission to view domains.").should('not.exist');
      cy.get('[data-e2e="create-domain-button"]', { timeout: 10000 }).should('be.disabled');
    });

    it('secrets "Create secret" disabled when secrets:create denied', () => {
      cy.denyPermissions(['secrets:create']);
      cy.visit(`/project/${PROJECT_ID}/secrets`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.get('[data-e2e="create-secret-button"]', { timeout: 10000 }).should('be.disabled');
    });
  });

  // -------------------------------------------------------------------------
  // Server-side gates — loader-level RestrictedState rendering.
  // -------------------------------------------------------------------------
  describe('server-side gates', () => {
    it('project layout RestrictedState when projects:get denied', () => {
      cy.denyPermissions(['projects:get']);
      cy.visit(`/project/${PROJECT_ID}`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this project.").should('be.visible');
    });

    it('domains list RestrictedState when domains:list denied', () => {
      cy.denyPermissions(['domains:list']);
      cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view domains.").should('be.visible');
      cy.get('[data-e2e="create-domain-button"]').should('not.exist');
    });

    it('secrets list RestrictedState when secrets:list denied', () => {
      cy.denyPermissions(['secrets:list']);
      cy.visit(`/project/${PROJECT_ID}/secrets`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view secrets.").should('be.visible');
    });

    it('service-accounts detail RestrictedState when serviceaccounts:get denied', () => {
      cy.denyPermissions(['serviceaccounts:get']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
        failOnStatusCode: false,
      });
      cy.contains("You don't have permission to view this service account.").should('be.visible');
    });

    it('settings/general RestrictedState when projects:patch denied', () => {
      cy.denyPermissions(['projects:patch']);
      cy.visit(`/project/${PROJECT_ID}/settings/general`, { failOnStatusCode: false });
      cy.contains("You don't have permission to edit this project.").should('be.visible');
    });

    it('export policies list RestrictedState when exportpolicies:list denied', () => {
      cy.denyPermissions(['exportpolicies:list']);
      cy.visit(`/project/${PROJECT_ID}/export-policies`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view export policies.").should('be.visible');
    });

    it('export policies new RestrictedState when exportpolicies:create denied', () => {
      cy.denyPermissions(['exportpolicies:create']);
      cy.visit(`/project/${PROJECT_ID}/export-policies/new`, { failOnStatusCode: false });
      cy.contains("You don't have permission to create export policies.").should('be.visible');
    });

    it('domains detail RestrictedState when domains:get denied', () => {
      cy.denyPermissions(['domains:get']);
      cy.visit(`/project/${PROJECT_ID}/domains/any-domain`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this domain.").should('be.visible');
    });

    it('secrets detail RestrictedState when secrets:get denied', () => {
      cy.denyPermissions(['secrets:get']);
      cy.visit(`/project/${PROJECT_ID}/secrets/any-secret`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this secret.").should('be.visible');
    });

    it('SA new RestrictedState when serviceaccounts:create denied', () => {
      cy.denyPermissions(['serviceaccounts:create']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts/new`, { failOnStatusCode: false });
      cy.contains("You don't have permission to create service accounts.").should('be.visible');
    });

    it('SA list RestrictedState when serviceaccounts:list denied', () => {
      cy.denyPermissions(['serviceaccounts:list']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view service accounts.").should('be.visible');
    });

    // The service-account detail layout fetches the account before this child
    // route renders, so a placeholder ID 404s; needs a seeded service account.
    it.skip('SA policy-bindings RestrictedState when policybindings:list (org-scope) denied (requires seed service account)', () => {
      cy.denyPermissions(['policybindings:list']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}/policy-bindings`, {
        failOnStatusCode: false,
      });
      cy.contains("You don't have permission to view roles for this service account.").should(
        'be.visible'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Hidden row and detail actions — need real rows, so skipped until the
  // shared fixture seeds a domain and a service account.
  // -------------------------------------------------------------------------
  describe('hidden actions (require seeded resources)', () => {
    // Needs a domain row; on an empty list the assertion passes vacuously.
    it.skip('hides domains row delete when domains:delete denied (requires seed domain)', () => {
      cy.denyPermissions(['domains:delete']);
      cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
      cy.get('[data-e2e="domain-row-delete"]').should('not.exist');
    });

    // Needs a domain row; on an empty list the assertion passes vacuously.
    it.skip('hides domains row refresh when domains:update denied (requires seed domain)', () => {
      cy.denyPermissions(['domains:update']);
      cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
      cy.get('[data-e2e="domain-row-refresh"]').should('not.exist');
    });

    // Needs a domain row; on an empty list the assertion passes vacuously.
    it.skip('hides "Manage DNS Zone" row action when dnszones:list denied (requires seed domain)', () => {
      cy.denyPermissions(['dnszones:list']);
      cy.visit(`/project/${PROJECT_ID}/domains`, { failOnStatusCode: false });
      cy.contains('Manage DNS Zone').should('not.exist');
    });

    // Needs a real service account; a placeholder 404s and passes vacuously.
    it.skip('hides "Create key" when serviceaccountkeys:create denied (requires seed service account)', () => {
      cy.denyPermissions(['serviceaccountkeys:create']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
        failOnStatusCode: false,
      });
      cy.contains('button', /create key/i).should('not.exist');
    });

    // Needs a real service account; a placeholder 404s and passes vacuously.
    it.skip('hides danger card overlay only when serviceaccounts:delete denied (requires seed service account)', () => {
      cy.denyPermissions(['serviceaccounts:delete']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
        failOnStatusCode: false,
      });
      cy.get('[data-e2e="delete-service-account-button"]').should('not.exist');
    });

    // Needs a real service account; a placeholder 404s and passes vacuously.
    it.skip('hides DisplayName form when serviceaccounts:patch denied (requires seed service account)', () => {
      cy.denyPermissions(['serviceaccounts:patch']);
      cy.visit(`/project/${PROJECT_ID}/service-accounts/${SERVICE_ACCOUNT_ID}`, {
        failOnStatusCode: false,
      });
      cy.get('[data-e2e="service-account-display-name-input"]').should('not.exist');
    });
  });
});
