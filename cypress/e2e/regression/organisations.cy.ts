import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Organisations
 *
 * List page
 * [data-e2e="organization-card"]              Org row (typeless — new unified orgs)
 * [data-e2e="organization-card-personal"]     Personal org row (legacy typed)
 * [data-e2e="organization-card-standard"]     Standard org row (legacy typed)
 * Use the prefix selector [data-e2e^="organization-card"] to match any variant.
 * [data-e2e="create-organization-button"]     "Create organization" button
 *
 * Create dialog (OrgBillingSetupForm)
 * [data-e2e="create-organization-display-name"]  Organization display name input
 * [data-e2e="org-billing-contact-open"]           Open contact info dialog
 * [data-e2e="org-contact-email"]                  Contact email input
 * [data-e2e="org-contact-name"]                   Contact name input
 * [data-e2e="org-contact-line1"]                  Address line 1 (Places autocomplete when Maps key set)
 * [data-e2e="org-contact-line2"]                  Address line 2
 * [data-e2e="org-contact-city"]                   City
 * [data-e2e="org-contact-region"]                 State / Region
 * [data-e2e="org-contact-postal-code"]            Postal code
 * [data-e2e="org-contact-save"]                   Save contact info
 * [data-e2e="org-billing-payment-open"]           Open payment method dialog
 * [data-e2e="payment-method-display-name"]        Card display name input
 * [data-e2e="payment-method-submit"]              Add payment method submit
 * [data-e2e="org-billing-payment-summary"]        Saved card summary row
 * [data-e2e="create-organization-submit"]         Final create/submit button
 *
 * Billing address (account billing)
 * [data-e2e="billing-address-line1"]              Address line 1
 * [data-e2e="billing-address-line2"]              Address line 2
 * [data-e2e="billing-address-city"]               City
 * [data-e2e="billing-address-region"]             State / Region
 * [data-e2e="billing-address-postal-code"]        Postal code
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
    // The org exists (createStandardOrg waited for the /org/:id redirect), but the
    // account-level org LIST is eventually consistent — the new org can take a few
    // seconds to show up, longer when the account already has many orgs. Reload the
    // list until the name appears, then assert on the already-loaded page.
    cy.waitForOrgPresentInList(testName);
    // Newly created orgs are typeless (no Personal/Standard), so their card is
    // `organization-card` — match any card variant with a prefix selector.
    cy.contains('[data-e2e^="organization-card"]', testName, {
      timeout: 30_000,
    }).should('be.visible');
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
    // Assert the deleted org is gone via cy.contains(...).should('not.exist')
    // rather than cy.get(selector).should('not.contain.text', ...). When this
    // suite's org was the account's only extra org, deleting it can leave zero
    // matching cards (the list falls back to its empty state), and cy.get()
    // would hang waiting for an element that never reappears — failing the test.
    // cy.contains(...).should('not.exist') passes whether zero cards remain or
    // other orgs are still listed, and the generous timeout absorbs the
    // post-delete list invalidation/refetch. Newly created orgs are typeless, so
    // match any card variant with a prefix selector.
    cy.contains('[data-e2e^="organization-card"]', testName, {
      timeout: 15000,
    }).should('not.exist');
    cy.task('releaseTestOrg', resourceId, { log: false });
    // Clear last — signals after() that cleanup is done
    resourceId = '';
  });
});
