import { DnssecCard } from '@/features/edge/dns-zone/overview/dnssec-card';

// DNSSEC cannot be turned on for a zone yet, so the settings page shows the
// control switched off and disabled, with a line saying why.
describe('DNSSEC card', () => {
  it('shows DNSSEC switched off and disabled, with its explanation', () => {
    cy.mount(<DnssecCard />);

    cy.findByRole('switch', { name: 'DNSSEC' })
      .should('be.disabled')
      .and('have.attr', 'aria-checked', 'false')
      .invoke('attr', 'aria-describedby')
      .then((describedBy) => {
        cy.get(`[id="${describedBy}"]`).should(
          'have.text',
          'DNSSEC is not available for DNS zones yet.'
        );
      });
  });

  it('stays off when clicked', () => {
    cy.mount(<DnssecCard />);

    cy.findByRole('switch', { name: 'DNSSEC' }).click({ force: true });
    cy.findByRole('switch', { name: 'DNSSEC' }).should('have.attr', 'aria-checked', 'false');
  });
});
