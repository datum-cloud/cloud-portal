import { paths } from '@/utils/config/paths.config';

describe('Log in', () => {
  beforeEach(() => {
    // Reset any previous login state
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.visit(paths.auth.logIn);
  });

  it('should render the log in page', () => {
    // Check if we're redirected to the OIDC provider
    cy.url().should('include', Cypress.env('AUTH_OIDC_ISSUER'));

    cy.contains('.provider-name', 'Google').should('be.visible');
    cy.contains('.provider-name', 'GitHub').should('be.visible');
  });
});
