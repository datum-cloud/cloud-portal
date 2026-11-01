/// <reference types="cypress" />

/**
 * Org-area deny scenarios for the Phase 2 RBAC migration.
 *
 * `cy.denyPermissions` denies each listed `resource:verb` on both sides of the
 * check: SSR loader gates (`gateRouteAccess` → `RbacService`) read the
 * `e2e-deny` cookie through the test-only hook in
 * `app/modules/rbac/server/e2e-deny.server.ts`, and the browser's
 * `/api/permissions/*` calls hit a matching intercept. Every other check is
 * decided by the real upstream for the regression user.
 *
 * The org is the shard's shared regression org (`cy.ensureSharedResources()`),
 * so the org layout loader resolves. The group ID is a placeholder: the group
 * detail loader runs its gate before it fetches the group.
 */

describe('RBAC denials — org area', () => {
  const GROUP = 'rbac-denials-group';
  let ORG = '';

  before(() => {
    cy.ensureSharedResources().then((res) => {
      ORG = res.orgId;
    });
  });

  // ---------------------------------------------------------------------------
  // Client-side gates — PermissionButton disabled when the bulk check denies.
  // ---------------------------------------------------------------------------
  describe('client-side gates', () => {
    beforeEach(() => {
      cy.login();
    });

    it('projects "Add project" disabled when projects:create denied', () => {
      cy.denyPermissions(['projects:create']);
      cy.visit(`/org/${ORG}/projects`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.get('[data-e2e="create-project-button"]', { timeout: 10000 }).should('be.disabled');
    });

    it('team "Invite Member" disabled when userinvitations:create denied', () => {
      cy.denyPermissions(['userinvitations:create']);
      cy.visit(`/org/${ORG}/team`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.get('[data-e2e="invite-member-button"]', { timeout: 10000 }).should('be.disabled');
    });

    it('groups "Add group" disabled when groups:create denied', () => {
      cy.denyPermissions(['groups:create']);
      cy.visit(`/org/${ORG}/team/groups`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.contains('button', 'Add group').should('be.disabled');
    });
  });

  // ---------------------------------------------------------------------------
  // Server-side gates — loader-level RestrictedState rendering.
  // ---------------------------------------------------------------------------
  describe('server-side gates', () => {
    beforeEach(() => {
      cy.login();
    });

    it('org-detail RestrictedState when organizations:get denied', () => {
      cy.denyPermissions(['organizations:get']);
      cy.visit(`/org/${ORG}`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this organization.").should('be.visible');
    });

    it('projects list RestrictedState when projects:list denied', () => {
      cy.denyPermissions(['projects:list']);
      cy.visit(`/org/${ORG}/projects`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view projects.").should('be.visible');
    });

    it('team members list RestrictedState when organizationmemberships:list denied', () => {
      cy.denyPermissions(['organizationmemberships:list']);
      cy.visit(`/org/${ORG}/team`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view team members.").should('be.visible');
    });

    it('team groups list RestrictedState when groups:list denied', () => {
      cy.denyPermissions(['groups:list']);
      cy.visit(`/org/${ORG}/team/groups`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view groups.").should('be.visible');
    });

    it('group-detail RestrictedState when policybindings:list denied', () => {
      cy.denyPermissions(['policybindings:list']);
      cy.visit(`/org/${ORG}/team/groups/${GROUP}`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this group.").should('be.visible');
    });

    it('quotas RestrictedState when allowancebuckets:list denied', () => {
      cy.denyPermissions(['allowancebuckets:list']);
      cy.visit(`/org/${ORG}/settings/quotas`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view quotas.").should('be.visible');
    });

    it('policy-bindings RestrictedState when policybindings:list denied', () => {
      cy.denyPermissions(['policybindings:list']);
      cy.visit(`/org/${ORG}/settings/policy-bindings`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view policy bindings.").should('be.visible');
    });

    it('settings/general RestrictedState when organizations:patch denied', () => {
      cy.denyPermissions(['organizations:patch']);
      cy.visit(`/org/${ORG}/settings/general`, { failOnStatusCode: false });
      cy.contains("You don't have permission to edit this organization.").should('be.visible');
    });
  });
});
