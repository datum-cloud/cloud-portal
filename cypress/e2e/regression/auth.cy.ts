import { paths } from '@/utils/config/paths.config';

/**
 * Auth Regression Tests
 *
 * Covers deeper session and auth behaviour beyond the smoke suite.
 * These tests do not mutate any application data.
 *
 * Selector Reference
 * [data-e2e="user-menu-trigger"]  Avatar button that opens the user dropdown
 * [data-e2e="user-menu-logout"]   Log Out item inside the user dropdown
 */

describe('Authentication — regression', () => {
  it('should remain logged in after a full page refresh', () => {
    cy.login();
    cy.visit(paths.account.organizations.root);
    cy.url().should('include', paths.account.organizations.root);

    cy.reload();

    // After reload the session cookie is re-validated server-side.
    // The page must still render the authenticated view.
    cy.url().should('include', paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-personal"]').should('be.visible');
  });

  it('should block unauthenticated access to protected routes', () => {
    // Ensure no session exists before the request
    cy.clearCookies();

    cy.request({
      url: paths.account.organizations.root,
      followRedirect: false,
      failOnStatusCode: false,
    }).then((response) => {
      // Server must redirect — not serve the authenticated page
      expect(response.status).to.eq(302);
    });
  });

  it('should clear the session cookie and block access after logout', () => {
    cy.login();
    cy.visit(paths.account.organizations.root);
    cy.getCookie('_session').should('exist');

    cy.logout();

    // Cookie must be gone
    cy.getCookie('_session').should('not.exist');

    // Protected route must no longer be accessible
    cy.request({
      url: paths.account.organizations.root,
      followRedirect: false,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(302);
    });
  });
});
