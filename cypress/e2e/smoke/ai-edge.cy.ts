import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * AI Edge Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="ai-edge-card"]
 * - Name: [data-e2e="ai-edge-name"]
 *
 * Usage Examples:
 * - Get all AI Edge cards: cy.get('[data-e2e="ai-edge-card"]')
 * - Get name from first row: cy.get('[data-e2e="ai-edge-name"]').first()
 */

describe('AI Edge list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render the AI Edge table with a row named "Hello"', () => {
    cy.getProjectId().then((projectId) => {
      cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    });
    cy.get('[data-e2e="ai-edge-card"]').should('have.length.at.least', 1);
    cy.get('[data-e2e="ai-edge-name"]').should('contain.text', 'Hello');
  });
});
