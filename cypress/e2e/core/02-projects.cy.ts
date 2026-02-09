import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

describe('Load project list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render a list of the users projects and store project ID', () => {
    cy.getPersonalOrgId().then((personalOrgId) => {
      cy.log(`Personal Org ID: ${personalOrgId}`);
      cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId: personalOrgId }));
    });

    cy.get('[data-e2e="project-card"]').should('be.visible');
    cy.get('[data-e2e="project-card"]').should('have.length', 1);
    cy.get('[data-e2e="project-card"]').should('contain.text', 'Test Project');
    cy.get('[data-e2e="project-card-id-copy"]').should('be.visible');

    // Extract the project ID from the BadgeCopy component
    cy.get('[data-e2e="project-card"]')
      .find('[data-e2e="project-card-id-copy"]')
      .invoke('text')
      .then((projectId) => {
        const trimmedId = projectId.trim();
        // Store in Cypress shared state using alias (accessible within same test suite)
        cy.wrap(trimmedId).as('projectId');

        // Also store in Cypress.env for cross-test access (accessible across all tests)
        Cypress.env('projectId', trimmedId);

        cy.log(`Project ID stored: ${trimmedId}`);
      });

    // Verify the project ID was stored and can be accessed
    cy.get('@projectId').then((projectId) => {
      expect(projectId).to.be.a('string');
      expect(projectId).to.match(/^[a-z0-9-]+$/);
      cy.log(`Verified Project ID: ${projectId}`);
    });
  });
});
