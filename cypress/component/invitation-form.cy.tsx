import { InvitationForm } from '@/features/organization/team/invitation-form';
import type { InvitationFormSchema } from '@/resources/invitations';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mirrors the invite flow in cypress/e2e/regression/members.cy.ts so a
// datum-ui form or tag-input change that drops the typed emails from the
// submitted value fails here, without needing a staging account.
const rolesResponse = {
  apiVersion: 'iam.miloapis.com/v1alpha1',
  kind: 'RoleList',
  items: [
    {
      metadata: {
        name: 'viewer',
        namespace: 'datum-cloud',
        uid: 'role-viewer',
        resourceVersion: '1',
        creationTimestamp: '2026-01-01T00:00:00Z',
        annotations: {
          'kubernetes.io/display-name': 'Viewer',
          'kubernetes.io/description': 'Read-only access',
          'taxonomy.miloapis.com/product': 'Platform',
        },
      },
      spec: { includedPermissions: [] },
      status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
    },
  ],
};

function mountInvitationForm(onSubmit: (data: InvitationFormSchema) => void) {
  cy.intercept('GET', '**/namespaces/datum-cloud/roles*', rolesResponse).as('roles');
  cy.mount(
    <QueryClientProvider client={new QueryClient()}>
      <ConformAdapter>
        <InvitationForm onSubmit={onSubmit} />
      </ConformAdapter>
    </QueryClientProvider>
  );
  cy.wait('@roles');
}

function pickFirstRole() {
  cy.get('[role="combobox"]').first().click();
  cy.get('[role="option"]').first().click();
}

describe('InvitationForm', () => {
  it('submits the emails committed with Enter, lower-cased', () => {
    const onSubmit = cy.stub().as('onSubmit');
    mountInvitationForm(onSubmit);

    pickFirstRole();
    cy.get('[data-e2e="invite-emails-input"] input').type(
      'first@example.com{enter}Second@Example.com{enter}'
    );
    cy.get('[data-e2e="invite-emails-input"]')
      .should('contain.text', 'first@example.com')
      .and('contain.text', 'second@example.com');

    cy.get('[data-e2e="invite-submit"]').click();

    cy.get('@onSubmit').should('have.been.calledOnce');
    cy.get('@onSubmit')
      .its('firstCall.args.0')
      .should('deep.include', {
        emails: ['first@example.com', 'second@example.com'],
        role: 'viewer',
        roleNamespace: 'datum-cloud',
      });
  });

  it('refuses to submit without an email', () => {
    const onSubmit = cy.stub().as('onSubmit');
    mountInvitationForm(onSubmit);

    pickFirstRole();
    cy.get('[data-e2e="invite-submit"]').click();

    cy.contains('At least one email is required').should('be.visible');
    cy.get('@onSubmit').should('not.have.been.called');
  });
});
