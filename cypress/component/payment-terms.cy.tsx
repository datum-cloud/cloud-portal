import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PaymentTermsApplicationForm } from '@/features/onboarding/payment-terms/application-form';
import {
  ApplicationApproved,
  ApplicationDeclined,
  ApplicationUnderReview,
} from '@/features/onboarding/payment-terms/application-status';
import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { CreateOrganizationDialog } from '@/features/organization/create/create-organization-dialog';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const context = {
  orgId: 'acme',
  billingAccountName: 'acme-billing',
  orgDisplayName: 'Acme Corp',
  entry: 'onboarding' as const,
  applicant: { firstName: 'Jane', email: 'jane@acme.com' },
};

const application = {
  name: 'apply-acme-billing-abc',
  paymentOptionLabel: 'Pay by invoice',
  estimatedSpendLabel: '$2,500–$10,000',
  accountsPayableEmail: 'ap@acme.com',
  purchaseOrderNumber: 'PO-4471',
  submittedAt: '2026-10-02T09:00:00Z',
  declineMessage:
    "We couldn't verify your company details. Reply to our email with your company registration number, or add a card to continue.",
};

function withProviders(children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ConformAdapter>
        <ConfirmationDialogProvider>{children}</ConfirmationDialogProvider>
      </ConformAdapter>
    </QueryClientProvider>
  );
}

// Customers who can't pay by card apply for payment terms, and staff review
// the application (cloud-portal#1501, billing arrangements phase 2).
describe('Apply for payment terms', () => {
  beforeEach(() => {
    cy.viewport(1280, 1400);
  });

  it('asks for invoice details only when paying by invoice', () => {
    cy.mount(
      withProviders(
        <PaymentTermsApplicationForm
          orgId="acme"
          billingAccountName="acme-billing"
          orgDisplayName="Acme Corp"
          entry="onboarding"
          currency="USD"
          defaultLegalName="Acme Corporation Ltd"
        />
      )
    );

    cy.get('[data-e2e="payment-terms-legal-name"]').should('have.value', 'Acme Corporation Ltd');
    cy.get('[data-e2e="payment-terms-ap-email"]').should('exist');
    cy.screenshot('payment-terms-form', { capture: 'fullPage' });

    cy.get('[data-e2e="payment-terms-option-NotSure"]').click();
    cy.get('[data-e2e="payment-terms-ap-email"]').should('not.exist');
    cy.contains('Add a card instead').should(
      'have.attr',
      'href',
      '/onboarding/billing?method=card'
    );
  });

  it('requires the authorization confirmation and the invoice details', () => {
    cy.mount(
      withProviders(
        <PaymentTermsApplicationForm
          orgId="acme"
          billingAccountName="acme-billing"
          orgDisplayName="Acme Corp"
          entry="onboarding"
          currency="USD"
        />
      )
    );

    cy.get('[data-e2e="payment-terms-submit"]').click();
    cy.contains("Enter your organization's legal name").should('exist');
    cy.contains('Enter the email address invoices should go to').should('exist');
    cy.contains("Confirm you're authorized to apply for your organization").should('exist');
  });

  it('submits the application billing expects', () => {
    cy.intercept('POST', '**/namespaces/organization-acme/billingarrangementapplications*', {
      statusCode: 201,
      body: { metadata: { name: 'apply-acme-billing-abc' } },
    }).as('create');

    cy.mount(
      withProviders(
        <PaymentTermsApplicationForm
          orgId="acme"
          billingAccountName="acme-billing"
          orgDisplayName="Acme Corp"
          entry="onboarding"
          currency="USD"
          defaultLegalName="Acme Corporation Ltd"
        />
      )
    );

    // A select returns focus to its trigger as it closes; wait for that
    // before typing elsewhere, or the keystrokes can land on the trigger.
    const choose = (label: RegExp, option: string) => {
      cy.findByLabelText(label).click();
      cy.get('[role="option"]').contains(option).click();
      cy.get('[role="listbox"]').should('not.exist');
    };
    const fill = (selector: string, value: string) =>
      cy.get(selector).type(value).should('have.value', value);

    choose(/Organization type/, 'Company');
    fill('[data-e2e="payment-terms-website"]', 'acme.com');
    fill('[data-e2e="payment-terms-situation"]', 'We pay vendors by purchase order.');
    choose(/Estimated monthly spend/, '$2,500–$10,000');
    fill('[data-e2e="payment-terms-ap-email"]', 'ap@acme.com');
    fill('[data-e2e="payment-terms-po"]', 'PO-4471');
    cy.findByRole('checkbox').click();
    cy.get('[data-e2e="payment-terms-submit"]').click();

    cy.wait('@create')
      .its('request.body.spec')
      .should('deep.equal', {
        billingAccountRef: { name: 'acme-billing' },
        paymentOption: 'Invoice',
        organization: {
          legalName: 'Acme Corporation Ltd',
          type: 'Company',
          website: 'https://acme.com',
        },
        situation: 'We pay vendors by purchase order.',
        invoice: {
          estimatedMonthlySpend: 'From2500To10000',
          accountsPayableEmail: 'ap@acme.com',
          purchaseOrderNumber: 'PO-4471',
        },
        authorized: true,
      });
  });

  it('shows what was sent while the application is under review', () => {
    cy.mountRemixRoute(
      withProviders(
        <div className="mx-auto max-w-[480px] p-6">
          <ApplicationUnderReview context={context} application={application} />
        </div>
      )
    );

    cy.contains("We're reviewing your application").should('exist');
    cy.contains('Under review · Submitted 2 October 2026').should('exist');
    cy.screenshot('payment-terms-under-review', { capture: 'fullPage' });

    cy.get('[data-e2e="payment-terms-withdraw"]').click();
    cy.contains('Withdraw your application?').should('exist');
  });

  it('shows the granted terms once approved', () => {
    cy.mountRemixRoute(
      withProviders(
        <div className="mx-auto max-w-[480px] p-6">
          <ApplicationApproved
            context={context}
            terms={{
              name: 'acme-terms',
              netDays: 30,
              invoiceRecipients: ['ap@acme.com', 'jane@acme.com'],
              purchaseOrderNumber: 'PO-4471',
              billingCycle: 'Monthly, on the 1st',
            }}
          />
        </div>
      )
    );

    cy.contains("You're approved").should('exist');
    cy.contains('Acme Corp can now pay by invoice on net 30 terms.').should('exist');
    cy.contains('Credit limit').should('not.exist');
    cy.contains('Create your first project').should('exist');
    cy.screenshot('payment-terms-approved', { capture: 'fullPage' });
  });

  it("shows the reviewer's message when declined", () => {
    cy.mountRemixRoute(
      withProviders(
        <div className="mx-auto max-w-[480px] p-6">
          <ApplicationDeclined context={{ ...context, entry: 'setup' }} application={application} />
        </div>
      )
    );

    cy.contains("We couldn't approve your application").should('exist');
    cy.contains('company registration number').should('exist');
    cy.contains('Add a card').should(
      'have.attr',
      'href',
      '/onboarding/billing?method=card&orgId=acme'
    );
    cy.get('[data-e2e="payment-terms-apply-again"]').should(
      'have.attr',
      'href',
      '/onboarding/payment-terms?orgId=acme&account=acme-billing&apply=1'
    );
    cy.screenshot('payment-terms-declined', { capture: 'fullPage' });
  });

  it('reads as a new org when applying from the create-organization dialog', () => {
    cy.mountRemixRoute(
      withProviders(
        <div className="mx-auto max-w-[480px] p-6">
          <ApplicationUnderReview
            context={{ ...context, entry: 'create' }}
            application={application}
          />
        </div>
      )
    );

    cy.contains("you'll go straight on to create your first project").should('exist');
  });
});

describe('Offering payment terms under the card form', () => {
  const setup = { orgId: 'acme', accountName: 'acme-billing', namespace: 'organization-acme' };
  const contactInfo = { email: 'jane@acme.com', name: 'Jane Doe', country: 'US' } as never;

  it('links to the application once the org exists', () => {
    cy.mount(
      withProviders(
        <OrgBillingSetupForm
          stripePublishableKey="pk_test_123"
          contactDefaults={{}}
          initialSetup={setup}
          initialContactInfo={contactInfo}
          paymentTerms={{ entry: 'setup' }}
        />
      )
    );

    cy.get('[data-e2e="payment-terms-hint"]').should('contain.text', "Can't pay by card?");
    cy.get('[data-e2e="apply-for-payment-terms"]').should(
      'have.attr',
      'href',
      '/onboarding/payment-terms?orgId=acme'
    );
    cy.screenshot('payment-terms-hint');
  });

  it('links new users from onboarding with the onboarding entry', () => {
    cy.mount(
      withProviders(
        <OrgBillingSetupForm
          stripePublishableKey="pk_test_123"
          contactDefaults={{}}
          initialSetup={setup}
          initialContactInfo={contactInfo}
          paymentTerms={{ entry: 'onboarding' }}
        />
      )
    );

    cy.get('[data-e2e="apply-for-payment-terms"]').should(
      'have.attr',
      'href',
      '/onboarding/payment-terms?orgId=acme&from=onboarding'
    );
  });

  it('hands the new org to the create-organization dialog, which keeps it', () => {
    const onApply = cy.stub().as('onApply');
    cy.mount(
      withProviders(
        <OrgBillingSetupForm
          stripePublishableKey="pk_test_123"
          contactDefaults={{}}
          initialSetup={setup}
          initialContactInfo={contactInfo}
          paymentTerms={{ entry: 'create', onApply }}
        />
      )
    );

    cy.get('[data-e2e="apply-for-payment-terms"]').click();
    cy.get('@onApply').should('have.been.calledOnceWith', 'acme');
  });

  it('waits for contact details in the create-organization dialog', () => {
    cy.mount(
      withProviders(
        <CreateOrganizationDialog
          open
          onOpenChange={() => {}}
          contactDefaults={{}}
          stripePublishableKey="pk_test_123"
          onCreated={() => {}}
        />
      )
    );

    cy.get('[data-e2e="org-billing-contact-open"]').should('exist');
    cy.get('[data-e2e="payment-terms-hint"]').should('not.exist');
  });

  it('is not offered without the option, or on invoice terms', () => {
    cy.mount(
      withProviders(
        <OrgBillingSetupForm
          stripePublishableKey="pk_test_123"
          contactDefaults={{}}
          initialSetup={setup}
          initialContactInfo={contactInfo}
        />
      )
    );
    cy.get('[data-e2e="payment-terms-hint"]').should('not.exist');
  });
});
