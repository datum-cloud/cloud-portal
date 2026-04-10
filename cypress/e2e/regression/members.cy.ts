import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Members & Invitations
 *
 * Team list page
 * [data-e2e="invite-member-button"]       "Invite Member" button
 *
 * Invite form page
 * [data-e2e="invite-emails-input"]        Emails TagsInput container
 * [data-e2e="invite-submit"]              Invite submit button
 *
 * Row actions (inline)
 * [data-e2e="resend-invitation-button"]   Resend invitation button
 * [data-e2e="cancel-invitation-button"]   Cancel invitation button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-submit"] Confirm button
 *
 * Note: Team pages require a Standard org — personal orgs return 500.
 * This suite creates a dedicated Standard org in before() and cleans it up in after().
 */

describe('Members & Invitations — regression', () => {
  const orgName = `e2e-test-members-${Date.now()}`;
  const testEmail = `e2e-${Date.now()}@example.com`;
  let orgId = '';

  // Keep this simple: Cypress retries this query until timeout.
  const invitationRow = (email: string): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.contains('table tbody tr', email, { timeout: 60000 }).should('be.visible');

  // Create a Standard org — team pages are restricted to Standard orgs only.
  before(() => {
    cy.login();
    cy.createStandardOrg(orgName).then((id) => {
      orgId = id;
    });
  });

  after(() => {
    if (!orgId) return;
    cy.task('deleteOrgViaApi', orgId);
  });

  beforeEach(() => {
    cy.login();
  });

  it('should show at least one member on the team page', () => {
    cy.visit(getPathWithParams(paths.org.detail.team.root, { orgId }));
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('should invite a member', () => {
    cy.visit(getPathWithParams(paths.org.detail.team.invite, { orgId }));
    // Role is required — open the combobox and pick the first available option
    cy.get('[role="combobox"]').first().click();
    cy.get('[role="option"]').first().click();
    cy.get('[data-e2e="invite-emails-input"] input').type(`${testEmail}{enter}`);
    cy.get('[data-e2e="invite-submit"]').click();
    // Form navigates to team root on success — invitation can take time to materialize.
    invitationRow(testEmail);
  });

  it('should show a resend outcome message', () => {
    cy.visit(getPathWithParams(paths.org.detail.team.root, { orgId }));
    invitationRow(testEmail).closest('tr').find('[data-e2e="resend-invitation-button"]').click();
    cy.contains(
      /Invitation resent successfully|Please wait .* before resending this invitation/i
    ).should('be.visible');
  });

  it('should cancel the invitation', () => {
    cy.visit(getPathWithParams(paths.org.detail.team.root, { orgId }));
    invitationRow(testEmail).closest('tr').find('[data-e2e="cancel-invitation-button"]').click();
    cy.get('[data-e2e="confirmation-dialog-submit"]', { timeout: 10000 }).click();
    cy.contains('table tbody tr', testEmail).should('not.exist');
  });
});
