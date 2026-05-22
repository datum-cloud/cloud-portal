// Import from source files (not the `@/modules/rbac` barrel): the barrel
// intentionally excludes server-only entrypoints, and these deep imports keep
// any server-only code (prom-client, axios, control-plane SDK) out of the
// browser bundle Cypress builds for component tests.
import { PermissionGate } from '@/modules/rbac/components/PermissionGate';
import { RbacProvider } from '@/modules/rbac/context/rbac.provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const ORG_ID = 'acme';

/**
 * Stub the async per-check BFF endpoint. The client posts each check to
 * `POST /api/permissions/check`; the gate renders based on the result.
 */
function stubCheck(allowed: boolean) {
  cy.intercept('POST', '/api/permissions/check', {
    statusCode: 200,
    body: { success: true, data: { allowed, denied: !allowed } },
  }).as('check');
}

function mountGate(children: ReactNode) {
  // A fresh client per mount keeps cached results isolated between tests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <RbacProvider organizationId={ORG_ID}>{children}</RbacProvider>
    </QueryClientProvider>
  );
}

describe('PermissionGate', () => {
  it('renders children when the permission is allowed', () => {
    stubCheck(true);
    mountGate(
      <PermissionGate resource="secrets" verb="delete">
        <button type="button">Delete secret</button>
      </PermissionGate>
    );

    cy.wait('@check');
    cy.get('button').should('be.visible').and('contain', 'Delete secret');
  });

  it('hides children when denied (default hide mode)', () => {
    stubCheck(false);
    mountGate(
      <PermissionGate resource="secrets" verb="delete">
        <button type="button">Delete secret</button>
      </PermissionGate>
    );

    cy.wait('@check');
    cy.get('button').should('not.exist');
  });

  it('disables children when denied in disable mode', () => {
    stubCheck(false);
    mountGate(
      <PermissionGate resource="secrets" verb="delete" mode="disable">
        <button type="button">Delete secret</button>
      </PermissionGate>
    );

    cy.wait('@check');
    cy.get('button').should('exist').and('be.disabled');
  });
});
