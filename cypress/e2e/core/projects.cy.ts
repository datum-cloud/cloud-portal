import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

describe('Load project list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should render a list of the users projects and store project ID', () => {
    cy.getPersonalOrgId().then((orgId) => {
      cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId }));
    });

    cy.get('[data-e2e="project-card"]').should('be.visible').and('have.length', 2);
    cy.get('[data-e2e="project-card"]').should('contain.text', 'Test Project');

    cy.get('[data-e2e="project-card"]')
      .first()
      .find('[data-e2e="project-card-id-copy"]')
      .invoke('text')
      .then((projectId) => {
        const trimmedId = projectId.trim();
        expect(trimmedId).to.match(/^[a-z0-9-]+$/);
        Cypress.env('projectId', trimmedId);
      });
  });
});
