import { paths } from '@/utils/config/paths.config';

describe('Log in', () => {
  it('should render the log in page and log in with valid credentials', () => {
    // Use the reusable login command with session caching
    cy.login();

    // Verify we're logged in and on the home page
    cy.visit(paths.account.organizations.root);
    cy.url().should('include', paths.account.organizations.root);
  });
});
