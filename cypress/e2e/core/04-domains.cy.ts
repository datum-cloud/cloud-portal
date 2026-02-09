import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Domains Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="domain-card"]
 * - Domain name: [data-e2e="domain-name"]
 * - Registrar: [data-e2e="domain-registrar"]
 * - DNS Host/Nameservers: [data-e2e="domain-nameservers"]
 * - Expiration Date: [data-e2e="domain-expiration"]
 *
 * Usage Examples:
 * - Get all domain cards: cy.get('[data-e2e="domain-card"]')
 * - Get domain name from first row: cy.get('[data-e2e="domain-name"]').first()
 * - Get registrar from first row: cy.get('[data-e2e="domain-registrar"]').first()
 * - Get nameservers from first row: cy.get('[data-e2e="domain-nameservers"]').first()
 * - Get expiration date: cy.get('[data-e2e="domain-expiration"]').first()
 */

describe('Load domains', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render a list of the users domains', () => {
    cy.getProjectId().then((projectId) => {
      cy.log(`Project ID: ${projectId}`);
      cy.visit(getPathWithParams(paths.project.detail.domains.root, { projectId: projectId }));
    });

    // Wait for table to load
    cy.get('[data-e2e="domain-card"]').should('have.length.at.least', 1);

    // Assert on each row in the table
    cy.get('[data-e2e="domain-card"]').each(($card, index) => {
      // Domain Name - should be visible and not empty
      cy.get('[data-e2e="domain-name"]').eq(index).should('be.visible').and('not.be.empty');

      // Registrar - should be visible
      // Can contain: Badge with registrar name, "Private" badge, "Looking up..." text, or dash "-"
      cy.get('[data-e2e="domain-registrar"]').eq(index).should('be.visible');

      // DNS Host/Nameservers - should be visible
      // Can contain: NameserverChips, "Looking up..." text, or dash "-"
      cy.get('[data-e2e="domain-nameservers"]').eq(index).should('be.visible');

      // Expiration Date - should be visible
      cy.get('[data-e2e="domain-expiration"]').eq(index).should('be.visible');

      cy.log(`Verified row ${index + 1} in domains table`);
    });

    // Assert specific domain names exist
    cy.get('[data-e2e="domain-name"]').should('contain.text', 'test-zone.com');
  });
});
