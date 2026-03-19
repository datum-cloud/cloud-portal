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
      cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
    });

    cy.get('[data-e2e="dns-zone-card"]').should('have.length.at.least', 1);
    cy.get('[data-e2e="dns-zone-name"]').first().should('be.visible').and('not.be.empty');
    cy.get('[data-e2e="dns-zone-name"]').should('contain.text', 'test-zone.com');
    cy.get('[data-e2e="dns-zone-name"]').should('contain.text', 'test-zone-two.com');
  });
});
