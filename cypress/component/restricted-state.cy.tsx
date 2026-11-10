import {
  RESTRICTED_GUIDANCE,
  RestrictedState,
} from '@/components/restricted-state/restricted-state';

describe('RestrictedState', () => {
  it('tells the user who can grant access', () => {
    cy.mount(<RestrictedState message="You don't have permission to view this project." />);

    cy.contains('Access restricted').should('be.visible');
    cy.contains("You don't have permission to view this project.").should('be.visible');
    cy.contains(RESTRICTED_GUIDANCE).should('be.visible');
  });

  it('hides the guidance when a page opts out', () => {
    cy.mount(<RestrictedState guidance={null} />);

    cy.contains("You don't have permission to view this.").should('be.visible');
    cy.contains(RESTRICTED_GUIDANCE).should('not.exist');
  });
});
