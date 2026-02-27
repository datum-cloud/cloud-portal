import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Secrets Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="secret-card"]
 * - Secret name: [data-e2e="secret-name"]
 * - Secret type: [data-e2e="secret-type"]
 * - Secret created at: [data-e2e="secret-created-at"]
 *
 * Usage Examples:
 * - Get all secret cards: cy.get('[data-e2e="secret-card"]')
 * - Get secret name from first row: cy.get('[data-e2e="secret-name"]').first()
 * - Get secret type from first row: cy.get('[data-e2e="secret-type"]').first()
 * - Get secret created at from first row: cy.get('[data-e2e="secret-created-at"]').first()
 */

describe('Load secrets', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render a list of the users secrets', () => {
    cy.getProjectId().then((projectId) => {
      cy.log(`Project ID: ${projectId}`);
      cy.visit(
        getPathWithParams(paths.project.detail.config.secrets.root, { projectId: projectId })
      );
    });

    // Wait for table to load
    cy.get('[data-e2e="secret-card"]').should('have.length.at.least', 1);

    // Assert on each row in the table
    cy.get('[data-e2e="secret-card"]').each(($card, index) => {
      // Secret Name - should be visible and not empty
      cy.get('[data-e2e="secret-name"]').eq(index).should('be.visible').and('not.be.empty');

      // Secret Type - should be visible
      // Contains: Badge with secret type label
      cy.get('[data-e2e="secret-type"]').eq(index).should('be.visible');

      // Created At - should be visible and not empty
      cy.get('[data-e2e="secret-created-at"]').eq(index).should('be.visible').and('not.be.empty');

      cy.log(`Verified row ${index + 1} in secrets table`);
    });

    // assert what the name is
    cy.get('[data-e2e="secret-name"]').should('contain.text', 'test-secret');
  });
});
