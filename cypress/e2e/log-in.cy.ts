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

    // Use data-e2e attributes for more reliable testing
    cy.get('[e2e="google"]').should('be.visible');
    cy.get('[e2e="github"]').should('be.visible');
  });
});
