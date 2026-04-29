import { paths } from '@/utils/config/paths.config';

/**
 * Selector Reference — Account Settings
 *
 * Active Sessions tab
 * [data-e2e="current-session-badge"]   "Current session" badge on the row matching the OIDC sid
 * [data-e2e="revoke-session-button"]   Inline revoke button on each session row
 */

describe('Load account settings', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should navigate to activity tab and see the activity table', () => {
    cy.visit(paths.account.settings.activity);
    // Smoke goal: the activity page loads without crashing.
    // The <table> element is always rendered regardless of whether rows exist,
    // so waiting for it confirms the page settled without racing against data load.
    cy.get('table', { timeout: 10000 }).should('exist');
  });

  it('should navigate to general tab and see profile, notifications, and account identity', () => {
    cy.visit(paths.account.settings.general);

    cy.get('[data-e2e="page-title"]').should('contain.text', 'Your Profile');
    // Wait for API to load (skeleton is replaced by real card) - assert on stable card title
    // scrollIntoView ensures the card is in viewport (it's below Profile + Identity cards)
    cy.get('[data-e2e="notification-settings-card"]', { timeout: 5000 })
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Marketing & Events Notifications')
      .and('contain.text', 'Newsletter');
    cy.get('[data-e2e="account-identities-card"]').should('be.visible');
    cy.get('[data-e2e="account-identity-item"]')
      .should('have.length', 1)
      .and('contain.text', 'Email');
  });

  it('should navigate to active sessions tab and render the sessions table', () => {
    cy.visit(paths.account.settings.activeSessions);

    // Smoke goal: the page loads without crashing. The table is always rendered
    // (even when the sessions list is empty) so waiting for it confirms the
    // page settled past the React Query fetch.
    cy.get('table', { timeout: 10000 }).should('exist');

    // Both `cy.login()` and the GraphQL sessions query are bypass-style: the
    // login helper signs the `_session` cookie directly and never seeds an
    // `_id_token`, and milo has no real Zitadel session to list back. So we
    // can't assume any data rows or revoke buttons exist here, and the
    // "Current session" badge never renders (the loader's `currentSession`
    // is null without `_id_token`). Assert what's actually deterministic.
    cy.get('[data-e2e="current-session-badge"]').should('not.exist');
    // If sessions DO come back, every revoke button must be enabled (the only
    // case the page disables is the current session, which can't apply here).
    cy.get('body').then(($body) => {
      if ($body.find('[data-e2e="revoke-session-button"]').length > 0) {
        cy.get('[data-e2e="revoke-session-button"]').each(($btn) => {
          cy.wrap($btn).should('not.be.disabled');
        });
      }
    });
  });
});
