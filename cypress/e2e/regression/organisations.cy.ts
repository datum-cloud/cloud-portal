import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Organisations
 *
 * List page
 * [data-e2e="organization-card-personal"]     Personal org row
 * [data-e2e="organization-card-standard"]     Standard org row
 * [data-e2e="create-organization-button"]     "Create organization" button
 *
 * Create dialog
 * [data-e2e="create-organization-name-input"] Organization Name input
 *
 * General settings
 * [data-e2e="edit-organization-name-input"]   Organization Name input
 * [data-e2e="edit-organization-save"]         Save button
 * [data-e2e="edit-organization-cancel"]       Cancel button
 *
 * Danger zone
 * [data-e2e="delete-organization-button"]     Delete organization button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-input"]      Type DELETE to confirm input
 * [data-e2e="confirmation-dialog-submit"]     Confirm/Delete button
 * [data-e2e="confirmation-dialog-cancel"]     Cancel button
 */

describe('Organisations — regression', () => {
  const testName = `e2e-test-org-${Date.now()}`;
  const updatedName = `${testName}-updated`;
  let resourceId = '';

  // Creates the test org once before all tests in this suite.
  // If this fails, all tests are skipped — fix before() first.
  before(() => {
    cy.login();
    cy.createStandardOrg(testName).then((id) => {
      resourceId = id;
    });
  });

  // Safety net — deletes the org via API if any test failed before the delete test ran.
  // If the delete test already ran it sets resourceId = '' so this is a no-op.
  after(() => {
    if (!resourceId) return;
    cy.task('deleteOrgViaApi', resourceId);
  });

  beforeEach(() => {
    cy.login();
  });

  it('should appear in the organisations list after creation', () => {
    cy.visit(paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-standard"]')
      .should('have.length.at.least', 1)
      .and('contain.text', testName);
  });

  it('should load the org detail page', () => {
    cy.visit(getPathWithParams(paths.org.detail.root, { orgId: resourceId }));
    cy.url().should('include', `/org/${resourceId}`);
  });

  it('should update the org display name', () => {
    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId: resourceId }));
    const suffix = '-updated';
    cy.get('[data-e2e="edit-organization-name-input"]', { timeout: 10000 })
      .should('be.visible')
      .type(suffix, { force: true });
    cy.get('[data-e2e="edit-organization-save"]').click();
    cy.contains('The Organization has been updated successfully').should('be.visible');
    cy.get('[data-e2e="edit-organization-name-input"]').should('have.value', updatedName);
  });

  it('should show quotas on the org quotas tab', () => {
    cy.visit(getPathWithParams(paths.org.detail.settings.quotas, { orgId: resourceId }));
    // Quotas are provisioned async after org creation — allow extra time
    cy.get('[data-e2e="org-quota-card"]', { timeout: 15000 }).should('have.length.at.least', 1);
  });

  it('should delete the org and remove it from the list', () => {
    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId: resourceId }));
    cy.get('[data-e2e="delete-organization-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-organization-button"]').scrollIntoView().click();
    cy.get('[data-e2e="confirmation-dialog-input"]', { timeout: 10000 }).type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-standard"]').should('not.contain.text', testName);
    // Clear last — signals after() that cleanup is done
    resourceId = '';
  });
});
