import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Application Load Balancer Table Selectors
 *
 * Data-e2e attributes:
 * - Row card: [data-e2e="alb-card"]
 * - Name: [data-e2e="alb-name"]
 *
 * Usage Examples:
 * - Get all Application Load Balancer cards: cy.get('[data-e2e="alb-card"]')
 * - Get name from first row: cy.get('[data-e2e="alb-name"]').first()
 */

describe('Application Load Balancer list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render the Application Load Balancer table with a row named "Hello"', () => {
    cy.getProjectId().then((projectId) => {
      cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    });
    cy.get('[data-e2e="alb-card"]').should('have.length.at.least', 1);
    cy.get('[data-e2e="alb-name"]').should('contain.text', 'Hello');
  });
});
