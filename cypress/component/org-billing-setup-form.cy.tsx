import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const contactInfo = {
  email: 'billing@example.com',
  name: 'Jane Doe',
  country: 'US',
} as never;

const initialSetup = {
  orgId: 'acme',
  accountName: 'acme',
  namespace: 'organization-acme',
};

function mountForm(props: { onInvoiceTerms?: boolean; onComplete?: () => void }) {
  cy.mount(
    <QueryClientProvider client={new QueryClient()}>
      <OrgBillingSetupForm
        stripePublishableKey="pk_test_123"
        contactDefaults={{}}
        initialSetup={initialSetup}
        initialContactInfo={contactInfo}
        onInvoiceTerms={props.onInvoiceTerms}
        onComplete={props.onComplete}
      />
    </QueryClientProvider>
  );
}

// An org on staff-granted invoice terms has nothing to pay with, so the form
// must let it finish setup with contact info alone (cloud-portal#1501).
describe('OrgBillingSetupForm', () => {
  it('needs a card when the org has no payment terms', () => {
    mountForm({});

    cy.get('[data-e2e="org-billing-payment-open"]').should('exist');
    cy.get('[data-e2e="org-billing-invoice-terms"]').should('not.exist');
    cy.contains('Your card will be authorized').should('exist');
    cy.get('[data-e2e="create-organization-submit"]').should('be.disabled');
  });

  it('shows invoice terms in place of the card and lets the org continue', () => {
    const onComplete = cy.stub().as('onComplete');
    mountForm({ onInvoiceTerms: true, onComplete });

    cy.get('[data-e2e="org-billing-invoice-terms"]').should('contain.text', 'Paid by invoice');
    cy.get('[data-e2e="org-billing-payment-open"]').should('not.exist');
    cy.contains('Your card will be authorized').should('not.exist');

    cy.get('[data-e2e="create-organization-submit"]').should('be.enabled').click();
    cy.get('@onComplete').should('have.been.calledOnceWith', {
      orgId: 'acme',
      accountName: 'acme',
      contactInfo,
    });
  });
});
