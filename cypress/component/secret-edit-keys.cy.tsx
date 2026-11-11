import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import type { Secret } from '@/resources/secrets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const secret = { data: ['API_KEY', 'DB_PASSWORD'] } as Secret;

function mountKeys(readOnly = false) {
  cy.mount(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmationDialogProvider>
        <EditSecretKeys secret={secret} readOnly={readOnly} />
      </ConfirmationDialogProvider>
    </QueryClientProvider>,
    { initialEntries: ['/project/p-1/secrets/s-1'], path: '/project/:projectId/secrets/:secretId' }
  );
}

describe('EditSecretKeys', () => {
  it('names the icon-only edit and delete buttons after their key', () => {
    mountKeys();

    for (const key of secret.data ?? []) {
      cy.findByRole('button', { name: `Edit ${key}` }).should('exist');
      cy.findByRole('button', { name: `Delete ${key}` }).should('exist');
    }
  });

  it('keeps the edit button keyboard focusable', () => {
    mountKeys();

    cy.findByRole('button', { name: 'Edit API_KEY' }).focus();
    cy.focused().should('have.attr', 'aria-label', 'Edit API_KEY');
  });
});
