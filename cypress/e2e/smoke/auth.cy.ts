import { paths } from '@/utils/config/paths.config';

/**
 * Selector Reference — Auth / User Dropdown
 *
 * [data-e2e="user-menu-trigger"]  Avatar button that opens the user dropdown
 * [data-e2e="user-menu-logout"]   Log Out item inside the user dropdown
 */

describe('Authentication — smoke', () => {
  it('should redirect unauthenticated users away from protected pages', () => {
    // Use cy.request so Cypress does not follow the OIDC redirect chain to an external domain
    cy.request({
      url: paths.account.organizations.root,
      followRedirect: false,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(302);
    });
  });

  it('should load the dashboard after login', () => {
    cy.login();
    cy.visit(paths.account.organizations.root);
    cy.url().should('include', paths.account.organizations.root);
  });

  it('should redirect to login after logout', () => {
    // Stub the /login route so Cypress does not follow the onward OIDC redirect to the
    // external auth provider, which would cause a cross-origin navigation error.
    cy.intercept('GET', `${paths.auth.logIn}*`, { statusCode: 200, body: '' }).as('loginPage');

    cy.login();
    cy.visit(paths.account.organizations.root);
    cy.url().should('include', paths.account.organizations.root);

    // Open user menu and click Log Out
    cy.get('[data-e2e="user-menu-trigger"]').click();
    cy.get('[data-e2e="user-menu-logout"]').click();

    // Wait for the redirect to reach /login and assert the session cookie is gone
    cy.wait('@loginPage');
    cy.getCookie('_session').should('not.exist');
  });
});
