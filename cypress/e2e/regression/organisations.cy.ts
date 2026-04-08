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
    cy.visit(paths.account.organizations.root);
    cy.get('[data-e2e="create-organization-button"]').click();
    cy.get('[data-e2e="create-organization-name-input"]').type(testName);
    cy.contains('button', 'Confirm').click();
    // App redirects to /org/[orgId]/projects after creation
    cy.url()
      .should('match', /\/org\/[a-z0-9-]+\//)
      .then((url) => {
        resourceId = url.split('/org/')[1].split('/')[0];
      });
  });

  // Safety net — deletes the org if any test failed before the delete test ran.
  // If the delete test already ran it sets resourceId = '' so this is a no-op.
  after(() => {
    if (!resourceId) return;
    cy.login();
    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId: resourceId }));
    cy.get('[data-e2e="delete-organization-button"]').click();
    cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', paths.account.organizations.root);
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
    // Clear and type as separate queries — React re-renders after clear() detach the node
    cy.get('[data-e2e="edit-organization-name-input"]').clear();
    cy.get('[data-e2e="edit-organization-name-input"]').type(updatedName);
    cy.get('[data-e2e="edit-organization-save"]').click();
    cy.contains('The Organization has been updated successfully').should('be.visible');
    cy.get('[data-e2e="edit-organization-name-input"]').should('have.value', updatedName);
  });

  it('should show quotas on the org quotas tab', () => {
    cy.visit(getPathWithParams(paths.org.detail.settings.quotas, { orgId: resourceId }));
    cy.get('[data-e2e="org-quota-card"]').should('have.length.at.least', 1);
  });

  it('should delete the org and remove it from the list', () => {
    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId: resourceId }));
    cy.get('[data-e2e="delete-organization-button"]').click();
    cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-standard"]').should('not.contain.text', testName);
    // Clear last — signals after() that cleanup is done
    resourceId = '';
  });
});
