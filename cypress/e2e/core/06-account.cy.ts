import { paths } from '@/utils/config/paths.config';

/**
 * Activity Log Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="activity-card"]
 * - User (if shown): [data-e2e="activity-user"]
 * - Action: [data-e2e="activity-action"]
 * - Target/Details: [data-e2e="activity-target"]
 * - Date: [data-e2e="activity-date"]
 *
 * Usage Examples:
 * - Get all activity cards: cy.get('[data-e2e="activity-card"]')
 * - Get action from first row: cy.get('[data-e2e="activity-action"]').first()
 * - Get target from first row: cy.get('[data-e2e="activity-target"]').first()
 * - Get date from first row: cy.get('[data-e2e="activity-date"]').first()
 */

describe('Load account settings', () => {
  beforeEach(() => {
    cy.login();
  });

  // Activity Log
  it('should navigate to activity tab and see the activity table', () => {
    cy.visit(paths.account.settings.activity);

    // Wait for table to load
    cy.get('[data-e2e="activity-card"]').should('have.length.at.least', 1);

    // Check there are more than 0 rows
    cy.get('[data-e2e="activity-card"]').should('have.length.greaterThan', 0);
  });

  it('should navigate to general tab and see the general settings card', () => {
    cy.visit(paths.account.settings.general);

    //  check the page title is "Your Profile"
    cy.get('[data-e2e="page-title"]').should('contain.text', 'Your Profile');
  });

  it('should navigate to general tab and see the notification settings card', () => {
    cy.visit(paths.account.settings.general);

    // check the notification settings card is visible
    cy.get('[data-e2e="notification-settings-card"]').should('be.visible');

    // Check the card contains the text "Newsletter"
    cy.get('[data-e2e="notification-settings-card"]').should('contain.text', 'Newsletter');
  });
});
