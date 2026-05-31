// Deep import to avoid pulling server-only modules into the browser bundle.
import { useGuardedRouteData } from '@/modules/rbac/use-guarded-route-data';
// Use `cypress/react`'s `mount` directly: `cy.mount` (in
// cypress/support/component.tsx) wraps the tree in its own `MemoryRouter`,
// which conflicts with the `RouterProvider` we need here for the data router.
import { mount } from 'cypress/react';
import React from 'react';
import { createMemoryRouter, RouterProvider, type LoaderFunction } from 'react-router';

interface Envelope {
  data: { name: string };
  companions: Record<string, unknown>;
}

function ChildConsumer() {
  // Reads the loader data via the typed hook from the parent route id.
  const { data, companions } = useGuardedRouteData<Envelope['data'], Envelope['companions']>(
    'parent'
  );
  return (
    <div>
      <span data-cy="name">{data.name}</span>
      <span data-cy="companion-keys">{Object.keys(companions).join(',') || '(none)'}</span>
    </div>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div data-cy="error">{this.state.error.message}</div>;
    }
    return this.props.children as React.ReactNode;
  }
}

function ErrorBoundaryProbe({ children }: { children: React.ReactNode }) {
  // Cypress's component test runner surfaces thrown errors via the
  // browser's runtime error overlay, which the test can't programmatically
  // catch. We use a simple class-component boundary to render the thrown
  // message into the DOM so assertions can interrogate it.
  return <Boundary>{children}</Boundary>;
}

function buildRouter(loader: LoaderFunction) {
  return createMemoryRouter(
    [
      {
        id: 'parent',
        path: '/',
        loader,
        Component: () => (
          <ErrorBoundaryProbe>
            <ChildConsumer />
          </ErrorBoundaryProbe>
        ),
      },
    ],
    { initialEntries: ['/'] }
  );
}

describe('useGuardedRouteData', () => {
  it('returns typed data + companions when the loader is unrestricted', () => {
    const router = buildRouter(() => ({
      restricted: false,
      data: { name: 'zone-a' },
      companions: { domain: { name: 'd1' } },
    }));
    mount(<RouterProvider router={router} />);
    cy.get('[data-cy=name]').should('have.text', 'zone-a');
    cy.get('[data-cy=companion-keys]').should('have.text', 'domain');
    cy.get('[data-cy=error]').should('not.exist');
  });

  it('throws via assertNotRestricted when the loader returned restricted: true', () => {
    const router = buildRouter(() => ({ restricted: true }));
    mount(<RouterProvider router={router} />);
    cy.get('[data-cy=error]').should('contain.text', 'restricted loader data');
    cy.get('[data-cy=name]').should('not.exist');
  });

  it('throws when no loader data exists for the named route id', () => {
    // No id on the route, so useRouteLoaderData('parent') returns undefined.
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({ restricted: false, data: { name: 'x' }, companions: {} }),
          Component: () => (
            <ErrorBoundaryProbe>
              <ChildConsumer />
            </ErrorBoundaryProbe>
          ),
        },
      ],
      { initialEntries: ['/'] }
    );
    mount(<RouterProvider router={router} />);
    cy.get('[data-cy=error]').should('contain.text', "no loader data for route id 'parent'");
  });
});
