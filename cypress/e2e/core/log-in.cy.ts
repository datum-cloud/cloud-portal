import { paths } from '@/utils/config/paths.config';

describe('Log in', () => {
  it('should log in with valid credentials', () => {
    cy.login();
    cy.visit(paths.account.organizations.root);
    cy.url().should('include', paths.account.organizations.root);
  });
});
