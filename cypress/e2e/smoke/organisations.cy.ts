import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Org Quota Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="org-quota-card"]
 * - Resource Type: [data-e2e="org-quota-resource-type"]
 * - Usage container: [data-e2e="org-quota-usage"]
 * - Usage amount: [data-e2e="org-quota-usage-amount"] (e.g., "10 / 100")
 * - Usage percentage: [data-e2e="org-quota-usage-percentage"] (e.g., "(10%)")
 * - Usage bar: [data-e2e="org-quota-usage-bar"]
 * - Usage bar fill: [data-e2e="org-quota-usage-bar-fill"]
 * - Request Limit button: [data-e2e="org-quota-request-limit-button"] (only shown when >90%)
 *
 * Usage Examples:
 * - Get all quota cards: cy.get('[data-e2e="org-quota-card"]')
 * - Get resource type from first row: cy.get('[data-e2e="org-quota-resource-type"]').first()
 * - Get usage from first row: cy.get('[data-e2e="org-quota-usage"]').first()
 */

/**
 * Org Activity Log Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="activity-card"]
 * - User: [data-e2e="activity-user"] (shown for org scope)
 * - Action: [data-e2e="activity-action"]
 * - Target/Details: [data-e2e="activity-target"]
 * - Date: [data-e2e="activity-date"]
 *
 * Usage Examples:
 * - Get all activity cards: cy.get('[data-e2e="activity-card"]')
 * - Get user from first row: cy.get('[data-e2e="activity-user"]').first()
 * - Get action from first row: cy.get('[data-e2e="activity-action"]').first()
 */

describe('Load org list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render a list of the users orgs and store personal org ID', () => {
    cy.visit(paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-personal"]').should('be.visible');
    cy.get('[data-e2e="organization-card-standard"]').should('be.visible');

    // Extract the personal org ID from the BadgeCopy component
    // Find the personal org card, then find the badge with the org ID
    cy.get('[data-e2e="organization-card-personal"]')
      .find('[data-e2e="organization-card-id-copy"]')
      .first()
      .invoke('text')
      .then((orgId) => {
        const trimmedId = orgId.trim();
        // Store in Cypress shared state using alias (accessible within same test suite)
        cy.wrap(trimmedId).as('personalOrgId');

        // Also store in Cypress.env for cross-test access (accessible across all tests)
        Cypress.env('personalOrgId', trimmedId);

        cy.log(`Personal Org ID stored: ${trimmedId}`);
      });

    // Verify the org ID was stored and can be accessed
    cy.get('@personalOrgId').then((orgId) => {
      expect(orgId).to.be.a('string');
      expect(orgId).to.match(/^personal-org-[a-z0-9]+$/);
      cy.log(`Verified Personal Org ID: ${orgId}`);
    });
  });

  it('should navigate to org settings and check the quota tab', () => {
    cy.getPersonalOrgId().then((personalOrgId) => {
      cy.log(`Personal Org ID: ${personalOrgId}`);
      cy.visit(getPathWithParams(paths.org.detail.settings.quotas, { orgId: personalOrgId }));
    });

    // Wait for quota table to load
    cy.get('[data-e2e="org-quota-card"]').should('have.length.at.least', 1);

    // Assert on each row in the quota table
    cy.get('[data-e2e="org-quota-card"]').each(($card, index) => {
      // Resource Type - should be visible and not empty
      cy.get('[data-e2e="org-quota-resource-type"]')
        .eq(index)
        .should('be.visible')
        .and('not.be.empty');

      // Usage - should be visible
      cy.get('[data-e2e="org-quota-usage"]').eq(index).should('be.visible');

      // Usage amount (if status exists)
      cy.get('[data-e2e="org-quota-usage"]')
        .eq(index)
        .then(($usageContainer) => {
          // Check if usage data exists (not just "-")
          const hasUsageData =
            $usageContainer.find('[data-e2e="org-quota-usage-amount"]').length > 0;

          if (hasUsageData) {
            // Usage data exists, verify all components
            cy.wrap($usageContainer).within(() => {
              cy.get('[data-e2e="org-quota-usage-amount"]').should('be.visible');
              cy.get('[data-e2e="org-quota-usage-percentage"]').should('be.visible');
              cy.get('[data-e2e="org-quota-usage-bar"]').should('be.visible');
            });
          }
          // If it doesn't exist, that's fine - it means the quota has no status data
        });

      cy.log(`Verified row ${index + 1} in quota table`);
    });
  });

  it('should navigate to the org activity tab and check the activity table', () => {
    cy.getPersonalOrgId().then((personalOrgId) => {
      cy.log(`Personal Org ID: ${personalOrgId}`);
      cy.visit(getPathWithParams(paths.org.detail.settings.activity, { orgId: personalOrgId }));
    });

    // Check if activity table has data or shows empty state
    cy.get('body').then(($body) => {
      const activityCards = $body.find('[data-e2e="activity-card"]');

      if (activityCards.length > 0) {
        // Activity table has data - verify each row
        cy.get('[data-e2e="activity-card"]').should('have.length.at.least', 1);

        cy.get('[data-e2e="activity-card"]').each(($card, index) => {
          // User - should be visible (org activity shows user column)
          cy.get('[data-e2e="activity-user"]').eq(index).should('be.visible');

          // Action - should be visible and not empty
          cy.get('[data-e2e="activity-action"]').eq(index).should('be.visible').and('not.be.empty');

          // Target/Details - should be visible
          cy.get('[data-e2e="activity-target"]').eq(index).should('be.visible');

          // Date - should be visible and not empty
          cy.get('[data-e2e="activity-date"]').eq(index).should('be.visible').and('not.be.empty');

          cy.log(`Verified row ${index + 1} in org activity table`);
        });
      } else {
        // No activity cards found - verify empty state message
        cy.contains('No activity found').should('be.visible');
        cy.log('Verified empty state: No activity found');
      }
    });
  });
});
