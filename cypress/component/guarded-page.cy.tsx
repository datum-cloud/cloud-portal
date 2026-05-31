// Import from source file (not the `@/modules/rbac` barrel): the barrel
// intentionally excludes server-only entrypoints, and this deep import keeps
// any server-only code (prom-client, axios, control-plane SDK) out of the
// browser bundle Cypress builds for component tests.
import { GuardedPage } from '@/modules/rbac/components/GuardedPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

function withQuery(child: ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{child}</QueryClientProvider>;
}

describe('GuardedPage', () => {
  it('renders RestrictedState when loaderData.restricted is true', () => {
    cy.mount(
      withQuery(
        <GuardedPage
          loaderData={{ restricted: true }}
          restrictedTitle="Access restricted"
          restrictedMessage="You don't have permission to view this AI Edge.">
          {() => <div data-cy="content">should not render</div>}
        </GuardedPage>
      )
    );

    cy.contains('Access restricted').should('be.visible');
    cy.contains("You don't have permission to view this AI Edge.").should('be.visible');
    cy.get('[data-cy=content]').should('not.exist');
  });

  it('calls the render prop with (data, companions) when allowed', () => {
    cy.mount(
      withQuery(
        <GuardedPage
          loaderData={{
            restricted: false,
            data: { id: 'proxy-1', name: 'edge-a' },
            companions: { waf: { mode: 'Enforce' } },
          }}
          restrictedMessage="(unused)">
          {(data, companions) => (
            <>
              <div data-cy="data-name">{data.name}</div>
              <div data-cy="waf-mode">{companions.waf?.mode}</div>
            </>
          )}
        </GuardedPage>
      )
    );

    cy.get('[data-cy=data-name]').should('have.text', 'edge-a');
    cy.get('[data-cy=waf-mode]').should('have.text', 'Enforce');
  });

  it('seeds the query cache from seedCache before rendering children', () => {
    const qc = new QueryClient();
    cy.mount(
      <QueryClientProvider client={qc}>
        <GuardedPage
          loaderData={{
            restricted: false,
            data: { id: 'proxy-1' },
            companions: {},
          }}
          seedCache={({ data }) => [[['probe', data.id], { hydrated: true }]]}
          restrictedMessage="(unused)">
          {() => <div data-cy="ready">ready</div>}
        </GuardedPage>
      </QueryClientProvider>
    );

    cy.get('[data-cy=ready]')
      .should('exist')
      .then(() => {
        const cached = qc.getQueryData(['probe', 'proxy-1']);
        expect(cached).to.deep.equal({ hydrated: true });
      });
  });
});
