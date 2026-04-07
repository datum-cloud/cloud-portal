import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Organisations
 *
 * List page
 * [data-e2e="organization-card-personal"]    Personal org row
 * [data-e2e="organization-card-standard"]    Standard org row
 * [data-e2e="organization-card-id-copy"]     Resource ID badge inside an org row
 * [data-e2e="create-organization-button"]    "Create organization" button
 *
 * Create dialog
 * [data-e2e="create-organization-name-input"] Organization Name input
 *
 * General settings
 * [data-e2e="edit-organization-name-input"]  Organization Name input
 * [data-e2e="edit-organization-save"]        Save button
 * [data-e2e="edit-organization-cancel"]      Cancel button
 *
 * Danger zone
 * [data-e2e="delete-organization-button"]    Delete organization button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-input"]     Type DELETE to confirm input
 * [data-e2e="confirmation-dialog-submit"]    Confirm/Delete button
 * [data-e2e="confirmation-dialog-cancel"]    Cancel button
 */

describe('Organisations — regression', () => {
  const testOrgName = `e2e-test-org-${Date.now()}`;
  let createdOrgId: string;

  before(() => {
    cy.login();

    // Create org via UI
    cy.visit(paths.account.organizations.root);
    cy.get('[data-e2e="create-organization-button"]').click();
    cy.get('[data-e2e="create-organization-name-input"]').type(testOrgName);

    // Wait for the resource ID to be auto-generated then submit
    cy.contains('button', 'Confirm').click();

    // After creation the app navigates to the new org's detail page
    cy.url()
      .should('match', /\/org\/[a-z0-9-]+$/)
      .then((url) => {
        createdOrgId = url.split('/org/')[1];
        Cypress.env('testOrgId', createdOrgId);
      });
  });

  after(() => {
    cy.login();
    const orgId = createdOrgId || Cypress.env('testOrgId');
    if (!orgId) return;

    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId }));
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
      .and('contain.text', testOrgName);
  });

  it('should load the org detail page', () => {
    const orgId = createdOrgId || Cypress.env('testOrgId');
    cy.visit(getPathWithParams(paths.org.detail.root, { orgId }));
    cy.url().should('include', `/org/${orgId}`);
  });

  it('should update the org display name', () => {
    const orgId = createdOrgId || Cypress.env('testOrgId');
    const updatedName = `${testOrgName}-updated`;

    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId }));
    cy.get('[data-e2e="edit-organization-name-input"]').clear().type(updatedName);
    cy.get('[data-e2e="edit-organization-save"]').click();

    // Toast confirms success — then verify the input reflects the saved value
    cy.contains('The Organization has been updated successfully').should('be.visible');
    cy.get('[data-e2e="edit-organization-name-input"]').should('have.value', updatedName);
  });

  it('should show quotas on the org quotas tab', () => {
    const orgId = createdOrgId || Cypress.env('testOrgId');
    cy.visit(getPathWithParams(paths.org.detail.settings.quotas, { orgId }));
    cy.get('[data-e2e="org-quota-card"]').should('have.length.at.least', 1);
  });

  it('should delete the org and remove it from the list', () => {
    const orgId = createdOrgId || Cypress.env('testOrgId');

    cy.visit(getPathWithParams(paths.org.detail.settings.general, { orgId }));
    cy.get('[data-e2e="delete-organization-button"]').click();
    cy.get('[data-e2e="confirmation-dialog-input"]').type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();

    cy.url().should('include', paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-standard"]').should('not.contain.text', testOrgName);

    // Mark cleaned up so after() skips re-deleting
    Cypress.env('testOrgId', null);
  });
});
