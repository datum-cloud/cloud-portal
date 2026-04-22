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

  it('should show quotas on the project quotas tab', () => {
    cy.visit(getPathWithParams(paths.project.detail.settings.quotas, { projectId: resourceId }));
    // Quotas are provisioned async after project creation — allow extra time
    cy.get('[data-e2e="project-quota-card"]', { timeout: 15000 }).should('have.length.at.least', 1);
  });

  it('should delete the project and remove it from the list', () => {
    cy.visit(getPathWithParams(paths.project.detail.settings.general, { projectId: resourceId }));
    cy.get('[data-e2e="delete-project-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-project-button"]').scrollIntoView().click();
    cy.get('[data-e2e="confirmation-dialog-input"]', { timeout: 10000 }).type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', paths.org.detail.projects.root.replace('[orgId]', orgId));
    cy.get('body').should('not.contain.text', testName);
    // Clear last — signals after() that cleanup is done
    resourceId = '';
  });
});
