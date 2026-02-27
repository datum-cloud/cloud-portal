import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * DNS Zones Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="dns-zone-card"]
 * - Zone name: [data-e2e="dns-zone-name"]
 * - DNS Host/Nameservers: [data-e2e="dns-zone-nameservers"]
 * - Records count: [data-e2e="dns-zone-records"]
 * - Created At: [data-e2e="dns-zone-created-at"]
 * - Description: [data-e2e="dns-zone-description"]
 *
 * Usage Examples:
 * - Get all DNS zone cards: cy.get('[data-e2e="dns-zone-card"]')
 * - Get zone name from first row: cy.get('[data-e2e="dns-zone-name"]').first()
 * - Get nameservers from first row: cy.get('[data-e2e="dns-zone-nameservers"]').first()
 * - Get records count: cy.get('[data-e2e="dns-zone-records"]').first()
 */

describe('Load dns zones', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render a list of the users dns zones', () => {
    cy.getProjectId().then((projectId) => {
      cy.log(`Project ID: ${projectId}`);
      cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId: projectId }));
    });

    // Wait for table to load
    cy.get('[data-e2e="dns-zone-card"]').should('have.length.at.least', 1);

    // Assert on each row in the table
    cy.get('[data-e2e="dns-zone-card"]').each(($card, index) => {
      // Zone Name - should be visible and not empty
      cy.get('[data-e2e="dns-zone-name"]').eq(index).should('be.visible').and('not.be.empty');

      // DNS Host/Nameservers - should be visible
      // Can contain: NameserverChips, SpinnerIcon, or dash "-"
      cy.get('[data-e2e="dns-zone-nameservers"]').eq(index).should('be.visible');

      // Records count - should be visible and not empty
      cy.get('[data-e2e="dns-zone-records"]').eq(index).should('be.visible').and('not.be.empty');

      // Created At - should be visible and not empty
      cy.get('[data-e2e="dns-zone-created-at"]').eq(index).should('be.visible').and('not.be.empty');

      // Description - should be visible (can be empty or contain text)
      cy.get('[data-e2e="dns-zone-description"]').eq(index).should('be.visible');

      cy.log(`Verified row ${index + 1} in DNS zones table`);
    });

    cy.get('[data-e2e="dns-zone-name"]').should('have.length', 2);
    // assert what the name is
    cy.get('[data-e2e="dns-zone-name"]').should('contain.text', 'test-zone.com');
    cy.get('[data-e2e="dns-zone-name"]').should('contain.text', 'test-zone-two.com');
  });
});
