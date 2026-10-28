import { EmailRecipientCard } from '@/features/billing/cards/email-recipient-card';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';

// Stripe emails each invoice to one address, so billing settings edit a
// single invoice email that falls back to the billing contact.
describe('Invoice email', () => {
  const mountCard = (defaultEmail?: string) => {
    const onSubmit = cy.spy().as('submit');
    cy.mount(
      <ConformAdapter>
        <EmailRecipientCard
          defaultEmail={defaultEmail}
          contactEmail="jane@acme.com"
          onSubmit={onSubmit}
        />
      </ConformAdapter>
    );
  };

  it('saves one address', () => {
    mountCard('finance@acme.com');
    cy.contains("Leave empty to use your billing contact's email (jane@acme.com).").should('exist');
    cy.get('[data-e2e="invoice-email"]')
      .should('have.value', 'finance@acme.com')
      .clear()
      .type('ap@acme.com');
    cy.contains('button', 'Save').click();
    cy.get('@submit').should('have.been.calledWithMatch', { email: 'ap@acme.com' });
  });

  it('can be cleared, so invoices go to the billing contact', () => {
    mountCard('finance@acme.com');
    cy.get('[data-e2e="invoice-email"]').clear();
    cy.contains('button', 'Save').click();
    // An empty field submits no email, which clears the invoice email.
    cy.get('@submit').should((submit: unknown) => {
      const spy = submit as sinon.SinonSpy;
      expect(spy).to.have.been.calledOnce;
      expect(spy.firstCall.args[0].email ?? '').to.equal('');
    });
  });

  it('rejects an address that is not an email', () => {
    mountCard();
    cy.get('[data-e2e="invoice-email"]').type('not-an-email');
    cy.contains('button', 'Save').click();
    cy.contains('Enter a valid email address').should('exist');
    cy.get('@submit').should('not.have.been.called');
  });
});
