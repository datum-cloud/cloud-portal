import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Service Account "New" page — RBAC smoke.
 *
 * Verifies the create page renders the create UI for a permitted user (the CI
 * owner role) rather than RestrictedState. Guards the regression where the
 * project-scoped route gate dropped `check.projectId` and failed closed, so
 * even an owner saw "Access restricted" (#1297). The page gates
 * `serviceaccounts:create` via runRouteGate.
 */
describe('Service Account new page', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the create UI (not RestrictedState) for a permitted user', () => {
    cy.getProjectId().then((projectId) => {
      cy.visit(getPathWithParams(paths.project.detail.serviceAccounts.new, { projectId }));
    });

    // The create cards only render when the gate allows access — their
    // presence proves RBAC did not block the page.
    cy.contains('h3', 'CI/CD Pipeline', { timeout: 10000 }).should('be.visible');
    cy.contains('h3', 'Service').should('be.visible');
    // Explicit: the restricted state must not be shown for a permitted user.
    cy.contains('Access restricted').should('not.exist');
  });
});
