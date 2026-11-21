import { BillingDetailsCard } from '@/features/billing/cards/billing-details-card';
import type { BillingAccount } from '@/features/billing/types';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';

const account: BillingAccount = {
  apiVersion: 'billing.miloapis.com/v1alpha1',
  kind: 'BillingAccount',
  metadata: {
    name: 'acme-billing',
    namespace: 'organization-acme',
    annotations: { 'kubernetes.io/display-name': 'Acme billing' },
  },
  spec: {
    currencyCode: 'USD',
    contactInfo: {
      name: 'Jane Doe',
      email: 'jane@acme.com',
      businessName: 'Acme Inc.',
      invoiceEmails: ['finance@acme.com'],
      address: { country: 'US', line1: '1 Main St', city: 'Springfield', postalCode: '12345' },
    },
    taxIds: [{ type: 'us_ein', value: '12-3456789' }],
  },
};

// Billing details stay read-only until the owner chooses to edit them, so
// they can't be changed by accident.
describe('BillingDetailsCard', () => {
  const mountCard = (canEdit = true, onSubmit = cy.stub().as('submit').resolves()) => {
    cy.mount(
      <ConformAdapter>
        <BillingDetailsCard account={account} canEdit={canEdit} onSubmit={onSubmit} />
      </ConformAdapter>
    );
  };

  it('shows the details read-only', () => {
    mountCard();
    cy.get('[data-e2e="billing-details"]')
      .should('contain.text', 'Acme billing')
      .and('contain.text', 'Jane Doe')
      .and('contain.text', 'finance@acme.com')
      .and('contain.text', '1 Main St')
      .and('contain.text', '12-3456789');
    cy.get('input').should('not.exist');
  });

  it('opens the form on Edit and closes it on Cancel without saving', () => {
    mountCard();
    cy.get('[data-e2e="billing-details-edit"]').click();
    cy.get('[data-e2e="invoice-email"]').should('have.value', 'finance@acme.com').clear();
    cy.contains('button', 'Cancel').click();
    cy.get('@submit').should('not.have.been.called');
    cy.get('[data-e2e="billing-details"]').should('contain.text', 'finance@acme.com');
  });

  it('saves the edited details and returns to the read-only view', () => {
    mountCard();
    cy.get('[data-e2e="billing-details-edit"]').click();
    cy.get('[data-e2e="invoice-email"]').clear().type('ap@acme.com');
    cy.get('[data-e2e="billing-details-save"]').click();
    cy.get('@submit').should('have.been.calledWithMatch', {
      displayName: 'Acme billing',
      invoiceEmail: 'ap@acme.com',
      country: 'US',
      line1: '1 Main St',
    });
    cy.get('[data-e2e="billing-details"]').should('exist');
  });

  it('keeps the form open when saving fails', () => {
    mountCard(true, cy.stub().as('submit').rejects(new Error('nope')));
    cy.get('[data-e2e="billing-details-edit"]').click();
    cy.get('[data-e2e="billing-details-save"]').click();
    cy.get('@submit').should('have.been.calledOnce');
    cy.get('[data-e2e="invoice-email"]').should('exist');
  });

  it('leaves the invoice email optional, so clearing it uses the billing contact', () => {
    mountCard();
    cy.get('[data-e2e="billing-details-edit"]').click();
    cy.contains('label', 'Invoice email').should('not.contain.text', '*');
    cy.get('[data-e2e="invoice-email"]').clear();
    cy.get('[data-e2e="billing-details-save"]').click();
    cy.get('@submit')
      .should('have.been.calledOnce')
      .its('firstCall.args.0')
      .should((values: { invoiceEmail?: string }) =>
        expect(values.invoiceEmail ?? '').to.equal('')
      );
  });

  it('rejects an invoice email that is not an email', () => {
    mountCard();
    cy.get('[data-e2e="billing-details-edit"]').click();
    cy.get('[data-e2e="invoice-email"]').clear().type('not-an-email');
    cy.get('[data-e2e="billing-details-save"]').click();
    cy.contains('Enter a valid email address').should('exist');
    cy.get('@submit').should('not.have.been.called');
  });

  it('disables Edit without permission', () => {
    mountCard(false);
    cy.contains('button', 'Edit').should('be.disabled');
  });
});
