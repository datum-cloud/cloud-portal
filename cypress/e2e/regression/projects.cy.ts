import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Projects
 *
 * List page
 * [data-e2e="project-card"]               Project row
 * [data-e2e="project-card-id-copy"]       Resource ID badge inside a project row
 * [data-e2e="create-project-button"]      "Create project" button
 *
 * Create dialog
 * [data-e2e="create-project-name-input"]  Project name input
 *
 * General settings
 * [data-e2e="edit-project-name-input"]    Project name input
 * [data-e2e="edit-project-save"]          Save button
 * [data-e2e="edit-project-cancel"]        Cancel button
 *
 * Danger zone
 * [data-e2e="delete-project-button"]      Delete project button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-input"]  Type DELETE to confirm input
 * [data-e2e="confirmation-dialog-submit"] Confirm/Delete button
 * [data-e2e="confirmation-dialog-cancel"] Cancel button
 */

describe('Projects — regression', () => {
  const orgName = `e2e-test-projects-org-${Date.now()}`;
  const testName = `e2e-test-project-${Date.now()}`;
  const updatedName = `${testName}-updated`;
  let orgId = '';
  let resourceId = '';

  // Creates the test project once before all tests in this suite.
  // Project creation uses a background task queue (K8s reconciliation) so the
  // dialog closes immediately — we wait for the card to appear in the list
  // and extract the ID from there rather than from a URL redirect.
  before(() => {
    cy.login();
    cy.createStandardOrg(orgName)
      .then((id) => {
        orgId = id;
        return cy.createProjectInOrg(id, testName);
      })
      .then((id) => {
        resourceId = id;
      });
  });

  // Safety net — delete org via API if tests fail early (org delete cascades to project).
  after(() => {
    if (!orgId) return;
    cy.task('deleteOrgViaApi', orgId);
  });

  beforeEach(() => {
    cy.login();
  });

  it('should appear in the projects list after creation', () => {
    cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId }));
    cy.get('[data-e2e="project-card"]')
      .should('have.length.at.least', 1)
      .and('contain.text', testName);
  });

  it('should load the project detail page', () => {
    cy.visit(getPathWithParams(paths.project.detail.root, { projectId: resourceId }));
    cy.url().should('include', `/project/${resourceId}`);
  });

  it('should update the project display name', () => {
    cy.visit(getPathWithParams(paths.project.detail.settings.general, { projectId: resourceId }));
    const suffix = '-updated';
    cy.get('[data-e2e="edit-project-name-input"]', { timeout: 10000 })
      .should('be.visible')
      .type(suffix, { force: true });
    cy.get('[data-e2e="edit-project-save"]').click();
    cy.contains('The Project has been updated successfully').should('be.visible');
    cy.get('[data-e2e="edit-project-name-input"]').should('have.value', updatedName);
  });

  it('should show quotas on the project quotas page', () => {
    cy.visit(getPathWithParams(paths.project.detail.settings.quotas, { projectId: resourceId }));
    // Quotas are provisioned async after project creation — allow extra time.
    // 45s, raised from 15s: provisioning went from 1.2s to 4.1s between August
    // and September and has already overrun 15s on an unrelated PR. See #1502.
    cy.get('[data-e2e="project-quota-card"]', { timeout: 45000 }).should('have.length.at.least', 1);
  });

  // No retries: this test removes the resource the earlier tests set up, and
  // cypress replays only the failed test, never before(). A second attempt
  // would look for something the first attempt already deleted and report a
  // missing element instead of the assertion that actually failed.
  it('should delete the project and remove it from the list', { retries: 0 }, () => {
    cy.visit(getPathWithParams(paths.project.detail.settings.general, { projectId: resourceId }));
    // Root-scoped, so the path carries no `control-plane` segment the way the
    // project-scoped resources in domains.cy.ts do. Anchored past the name so a
    // sub-resource DELETE cannot satisfy this wait. The browser client's base is
    // /api/proxy, which the leading match absorbs.
    cy.intercept(
      'DELETE',
      /\/apis\/resourcemanager\.miloapis\.com\/v1alpha1\/projects\/[^/?]+(?:\?|$)/
    ).as('deleteProject');
    cy.get('[data-e2e="delete-project-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-project-button"]').scrollIntoView().click();
    cy.get('[data-e2e="confirmation-dialog-input"]', { timeout: 10000 }).type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();

    // What the portal owns, asserted strictly: it issued the DELETE, the API
    // accepted it, and the app left the detail page for the list.
    cy.wait('@deleteProject').its('response.statusCode').should('be.oneOf', [200, 202, 204]);
    cy.url().should('include', paths.org.detail.projects.root.replace('[orgId]', orgId));
    // The rename test runs first, so the list shows `updatedName`. Don't reload
    // here: a fresh SSR LIST can still include the deleted project after the
    // live watch has already dropped the card.
    cy.waitForProjectAbsentInOrg(orgId, updatedName);
    cy.task('releaseTestProject', resourceId, { log: false });
    // Clear last — project deleted via UI; after() still removes the org via API
    resourceId = '';
  });
});
