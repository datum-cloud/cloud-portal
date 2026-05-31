import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Use `cypress/react`'s `mount` directly: `cy.mount` (in
// cypress/support/component.tsx) wraps the tree in its own `MemoryRouter`,
// which conflicts with the `RouterProvider` we need here for the data router.
import { mount } from 'cypress/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

describe('defineResourceRoute.Page', () => {
  it('seeds the query cache when allowed', () => {
    const route = defineResourceRoute<{ name: string }>({
      type: 'detail',
      resource: 'dnszones',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      restrictedMessage: "You don't have permission to view this DNS zone.",
      seedCache: ({ data, projectId }) =>
        data ? [[['dns-zone', projectId, data.name], data]] : [],
    });

    const PageComponent = route.Page(({ data }) => <div data-cy="zone">{data.name}</div>);

    const qc = new QueryClient();
    const router = createMemoryRouter(
      [
        {
          path: '/p/:projectId/z/:dnsZoneId',
          loader: () => ({
            restricted: false,
            data: { name: 'zone-a' },
            companions: {},
          }),
          element: <PageComponent />,
        },
      ],
      { initialEntries: ['/p/p1/z/z1'] }
    );

    mount(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    cy.get('[data-cy=zone]')
      .should('have.text', 'zone-a')
      .then(() => {
        const cached = qc.getQueryData(['dns-zone', 'p1', 'zone-a']);
        expect(cached).to.deep.equal({ name: 'zone-a' });
      });
  });

  it('renders RestrictedState when loader returns restricted: true', () => {
    const route = defineResourceRoute<{ name: string }>({
      type: 'detail',
      resource: 'dnszones',
      paramName: 'dnsZoneId',
      notFoundLabel: 'DNS',
      restrictedMessage: "You don't have permission to view this DNS zone.",
    });

    const PageComponent = route.Page(({ data }) => <div>{data.name}</div>);

    const router = createMemoryRouter(
      [
        {
          path: '/p/:projectId/z/:dnsZoneId',
          loader: () => ({ restricted: true }),
          element: <PageComponent />,
        },
      ],
      { initialEntries: ['/p/p1/z/z1'] }
    );

    mount(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    cy.contains("You don't have permission to view this DNS zone.").should('be.visible');
  });
});
