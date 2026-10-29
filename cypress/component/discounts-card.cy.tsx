import { DiscountsCard } from '@/features/billing/cards/discounts-card';

// Customers see that discounts apply, never the Offer behind them or how
// staff configured it (staff-portal#751).
describe('DiscountsCard', () => {
  it('renders nothing without a discount above 0%', () => {
    cy.mount(
      <div data-e2e="host">
        <DiscountsCard
          discounts={[
            { serviceDisplayName: 'DNS', percentage: 0 },
            { serviceDisplayName: 'Edge', percentage: 0 },
          ]}
        />
      </div>
    );
    cy.get('[data-e2e="host"]').should('be.empty');
  });

  it('shows one line when every service has the same discount', () => {
    cy.mount(
      <DiscountsCard
        discounts={[
          { serviceDisplayName: 'DNS', percentage: 20 },
          { serviceDisplayName: 'Edge', percentage: 20 },
        ]}
      />
    );
    cy.get('[data-e2e="discounts-card"]').should('contain.text', '20% discount on all usage');
    cy.get('[data-e2e="discounts-list"]').should('not.exist');
    cy.contains('Discounts are applied to your invoices automatically.').should('exist');
  });

  it('lists each discounted service when percentages differ', () => {
    cy.mount(
      <DiscountsCard
        discounts={[
          { serviceDisplayName: 'Edge', percentage: 10 },
          { serviceDisplayName: 'DNS', percentage: 25 },
          { serviceDisplayName: 'Compute', percentage: 0 },
        ]}
      />
    );
    cy.get('[data-e2e="discounts-list"] li').should('have.length', 2);
    cy.get('[data-e2e="discounts-list"] li')
      .eq(0)
      .should('contain.text', 'DNS')
      .and('contain.text', '25%');
    cy.get('[data-e2e="discounts-list"] li')
      .eq(1)
      .should('contain.text', 'Edge')
      .and('contain.text', '10%');
    cy.get('[data-e2e="discounts-card"]').should('not.contain.text', 'Compute');
    cy.contains('Discounts are applied to your invoices automatically.').should('exist');
  });
});
