/// <reference types="cypress" />

/**
 * RBAC denial regression — pins deny-side behavior for the three migrated
 * project routes (Application Load Balancer, DNS Zones, Connectors) after the
 * Phase 1 `defineResourceRoute` + `useResourcePermissions` + `<PermissionGate>`
 * / `<PermissionButton>` migration.
 *
 * Two denial surfaces, one deny list: `cy.denyPermissions` sets the `e2e-deny`
 * cookie, which SSR loader gates (`gateRouteAccess` → `RbacService`) honour
 * through the test-only hook in `app/modules/rbac/server/e2e-deny.server.ts`,
 * and overrides the browser's `/api/permissions/*` stubs so client-side
 * `PermissionButton` / `PermissionGate` checks agree. Every other check is
 * decided by the real upstream for the regression user.
 *
 * The project is the shard's shared regression project
 * (`cy.ensureSharedResources()`), so the project layout loader resolves. Zone
 * and proxy IDs are placeholders: detail loaders run their gate before they
 * fetch the resource. Three cases stay skipped because they need a real proxy,
 * DNS record or DNS zone in the project, which the shared fixture does not seed.
 */

describe('RBAC denials — project routes', () => {
  const ZONE = 'rbac-denials-zone';
  const PROXY = 'rbac-denials-proxy';
  let PROJECT = '';

  before(() => {
    cy.ensureSharedResources().then((res) => {
      PROJECT = res.projectId;
    });
  });

  beforeEach(() => {
    cy.login();
  });

  // -------------------------------------------------------------------------
  // Application Load Balancer
  // -------------------------------------------------------------------------
  describe('Application Load Balancer', () => {
    it('listing renders RestrictedState when httpproxies:list denied (server-side gate)', () => {
      cy.denyPermissions(['httpproxies:list']);
      cy.visit(`/project/${PROJECT}/alb`, { failOnStatusCode: false });
      cy.contains('Access restricted').should('be.visible');
      cy.contains("You don't have permission to view Application Load Balancer.").should(
        'be.visible'
      );
    });

    it('listing disables "New" button when httpproxies:create denied', () => {
      cy.denyPermissions(['httpproxies:create']);
      cy.visit(`/project/${PROJECT}/alb`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.contains('Access restricted').should('not.exist');
      cy.get('[data-e2e="create-alb-button"]', { timeout: 10000 }).should('be.disabled');
    });

    it('detail direct-link renders RestrictedState when httpproxies:get denied (server-side gate)', () => {
      cy.denyPermissions(['httpproxies:get']);
      cy.visit(`/project/${PROJECT}/alb/${PROXY}/overview`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this Application Load Balancer.").should(
        'be.visible'
      );
    });

    // Needs a real proxy row in the shared project; the fixture seeds none, so
    // the assertion would pass vacuously on an empty table.
    it.skip('row Delete action hidden when httpproxies:delete denied (requires seed proxy)', () => {
      cy.denyPermissions(['httpproxies:delete']);
      cy.visit(`/project/${PROJECT}/alb`, { failOnStatusCode: false });
      cy.get('[data-e2e="alb-card"]')
        .first()
        .within(() => {
          cy.get('[role="menuitem"]').contains('Delete').should('not.exist');
        });
    });
  });

  // -------------------------------------------------------------------------
  // DNS Zones
  // -------------------------------------------------------------------------
  describe('DNS Zones', () => {
    it('listing renders RestrictedState when dnszones:list denied (server-side gate)', () => {
      cy.denyPermissions(['dnszones:list']);
      cy.visit(`/project/${PROJECT}/dns-zones`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view DNS.").should('be.visible');
    });

    it('listing disables "Add zone" button when dnszones:create denied', () => {
      cy.denyPermissions(['dnszones:create']);
      cy.visit(`/project/${PROJECT}/dns-zones`, { failOnStatusCode: false });
      cy.wait('@bulkCheck');
      cy.get('[data-e2e="create-dns-zone-button"]', { timeout: 10000 }).should('be.disabled');
    });

    it('detail direct-link renders RestrictedState when dnszones:get denied (server-side gate)', () => {
      cy.denyPermissions(['dnszones:get']);
      cy.visit(`/project/${PROJECT}/dns-zones/${ZONE}`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this DNS zone.").should('be.visible');
    });

    it('discovery direct-link renders RestrictedState when dnszones:get denied (server-side gate)', () => {
      cy.denyPermissions(['dnszones:get']);
      cy.visit(`/project/${PROJECT}/dns-zones/${ZONE}/discovery`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view this DNS zone.").should('be.visible');
    });

    // Needs an eligible (A/AAAA/CNAME, unprotected) DNS record in a real zone;
    // the shared fixture seeds no zone or record.
    it.skip('dns-records "Protect with ALB" disabled when httpproxies:create denied (requires seed eligible record)', () => {
      cy.denyPermissions(['httpproxies:create']);
      cy.visit(`/project/${PROJECT}/dns-zones/${ZONE}/dns-records`, { failOnStatusCode: false });
      cy.contains('button', 'Protect with ALB').should('be.disabled');
    });

    // The Refresh button renders only for a zone with `status.domainRef.name`,
    // which needs a real DNS zone the shared fixture does not seed.
    it.skip('nameservers "Refresh" disabled when domains:patch denied (requires seed DNS zone)', () => {
      cy.denyPermissions(['domains:patch']);
      cy.visit(`/project/${PROJECT}/dns-zones/${ZONE}/nameservers`, { failOnStatusCode: false });
      cy.contains('button', 'Refresh nameservers').should('be.disabled');
    });
  });

  // -------------------------------------------------------------------------
  // Connectors
  // -------------------------------------------------------------------------
  describe('Connectors', () => {
    it('listing renders RestrictedState when connectors:list denied (server-side gate)', () => {
      cy.denyPermissions(['connectors:list']);
      cy.visit(`/project/${PROJECT}/connectors`, { failOnStatusCode: false });
      cy.contains("You don't have permission to view connectors.").should('be.visible');
    });
  });
});
