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
      cy.visit(getPathWithParams(paths.project.detail.domains.root, { projectId }));
    });

    cy.get('[data-e2e="domain-card"]').should('have.length.at.least', 1);
    cy.get('[data-e2e="domain-name"]').first().should('be.visible').and('not.be.empty');
    cy.get('[data-e2e="domain-name"]').should('contain.text', 'test-zone.com');
  });
});
