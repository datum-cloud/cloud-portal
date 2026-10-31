import { BillingCycleAlert } from '@/features/usage/components/billing-cycle-alert';

describe('BillingCycleAlert', () => {
  it('tells the user the billing cycle could not be loaded', () => {
    cy.mount(<BillingCycleAlert show />);

    cy.get('[data-e2e="usage-billing-cycle-alert"]')
      .should('be.visible')
      .and('contain.text', 'Could not load billing cycle');
  });

  it('renders nothing when the billing account lookup worked', () => {
    cy.mount(
      <div data-e2e="host">
        <BillingCycleAlert show={false} />
      </div>
    );

    cy.get('[data-e2e="host"]').should('exist');
    cy.get('[data-e2e="usage-billing-cycle-alert"]').should('not.exist');
  });
});
