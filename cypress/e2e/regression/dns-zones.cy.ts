import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — DNS Zones
 *
 * List page
 * [data-e2e="create-dns-zone-button"]    "Add zone" button
 * [data-e2e="dns-zone-card"]             Zone row cell
 * [data-e2e="dns-zone-name"]             Zone domain name text
 *
 * Create dialog
 * [data-e2e="create-dns-zone-name-input"] Zone domain name input
 *
 * Settings page
 * [data-e2e="delete-dns-zone-button"]     Delete zone button
 *
 * DNS Records tab
 * "Add record" button — targeted by text content
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-input"]  Type DELETE to confirm input
 * [data-e2e="confirmation-dialog-submit"] Confirm button
 *
 * Note: Uses a dedicated Standard org + project created in before() and
 * cleaned up in after(). DNS zone creation is synchronous (no task queue).
 */

describe('DNS Zones — regression', () => {
  const orgName = `e2e-test-dns-org-${Date.now()}`;
  const projectName = `e2e-test-dns-project-${Date.now()}`;
  // Use a unique subdomain to avoid conflicts between runs
  const zoneDomain = `e2e-${Date.now()}.example.com`;
  let orgId = '';
  let projectId = '';
  let dnsZoneId = '';

  before(() => {
    cy.login();
    cy.createStandardOrg(orgName)
      .then((id) => {
        orgId = id;
        return cy.createProjectInOrg(id, projectName);
      })
      .then((id) => {
        projectId = id;
      });
  });

  after(() => {
    cy.login();
    if (dnsZoneId) {
      cy.visit(
        getPathWithParams(paths.project.detail.dnsZones.detail.settings, {
          projectId,
          dnsZoneId,
        })
      );
      cy.get('[data-e2e="delete-dns-zone-button"]').click();
      cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
      cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    }
    cy.deleteOrganizationIfExists(orgId);
  });

  beforeEach(() => {
    cy.login();
  });

  it('should create a DNS zone and appear in the list', () => {
    cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
    // Wait for the page to fully load before checking which button is present,
    // same pattern as createProjectInOrg — avoids clicking a button before React
    // has wired up the onClick handler.
    cy.url({ timeout: 10000 }).should('include', `project/${projectId}/dns-zones`);
    cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.find('[data-e2e="create-dns-zone-button"]').length > 0) {
        cy.get('[data-e2e="create-dns-zone-button"]').should('be.visible').click();
      } else {
        cy.contains('button', /add zone/i, { timeout: 10000 })
          .should('be.visible')
          .click();
      }
    });
    cy.get('[data-e2e="create-dns-zone-name-input"]').type(zoneDomain);
    cy.contains('button', 'Create').click();

    // After creation the app navigates to the discovery page — extract zone ID from URL
    cy.url()
      .should('match', /\/dns-zones\/[a-z0-9-]+\//)
      .then((url) => {
        const match = url.match(/\/dns-zones\/([a-z0-9-]+)\//);
        if (match) dnsZoneId = match[1];
      });
  });

  it('should show the DNS zone on the list page', () => {
    cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
    cy.contains('[data-e2e="dns-zone-name"]', zoneDomain, { timeout: 10000 }).should('be.visible');
  });

  it('should load the DNS records tab', () => {
    // Navigate via the list → click zone row → then DNS Records tab
    // (avoids relying on dnsZoneId closure which may be empty if test 1 failed)
    cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
    cy.contains('[data-e2e="dns-zone-name"]', zoneDomain, { timeout: 10000 }).click();
    cy.contains('a', 'DNS Records').click();
    cy.contains('DNS Records').should('be.visible');
    cy.contains('Add record').should('be.visible');
  });

  it('should delete the DNS zone', () => {
    cy.visit(
      getPathWithParams(paths.project.detail.dnsZones.detail.settings, {
        projectId,
        dnsZoneId,
      })
    );
    cy.get('[data-e2e="delete-dns-zone-button"]').click();
    cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', `project/${projectId}/dns-zones`);
    cy.contains('[data-e2e="dns-zone-name"]', zoneDomain).should('not.exist');
    dnsZoneId = '';
  });
});
