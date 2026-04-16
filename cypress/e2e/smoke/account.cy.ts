import { paths } from '@/utils/config/paths.config';

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
});
