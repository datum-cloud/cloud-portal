import { defineResourceRoute } from './define-resource-route';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { describe, expect, test } from 'vitest';

/** What React Router hands a route module's default export. */
interface RouteProps {
  params: { orgId: string };
}

function renderRoute(element: React.ReactElement, loaderData: unknown): string {
  const routes: RouteObject[] = [{ id: 'page', path: '/org/:orgId', element }];
  const router = createMemoryRouter(routes, {
    initialEntries: ['/org/acme'],
    hydrationData: { loaderData: { page: loaderData } },
  });

  return renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('defineResourceRoute.Page route props', () => {
  test('a list page hands the route props to render next to the loader data', () => {
    const route = defineResourceRoute<{ name: string }[]>({
      type: 'list',
      resource: 'projects',
      restrictedMessage: 'No access.',
    });
    const Page = route.Page<RouteProps>(({ data }, { params }) => (
      <p>
        {params.orgId}:{data.map((project) => project.name).join(',')}
      </p>
    ));

    const html = renderRoute(<Page params={{ orgId: 'acme' }} />, {
      restricted: false,
      data: [{ name: 'alpha' }, { name: 'beta' }],
      companions: {},
    });

    expect(html).toContain('acme');
    expect(html).toContain('alpha,beta');
  });

  test('a detail page hands the route props to render', () => {
    const route = defineResourceRoute<{ name: string }>({
      type: 'detail',
      resource: 'projects',
      paramName: 'orgId',
      notFoundLabel: 'Project',
      restrictedMessage: 'No access.',
    });
    const Page = route.Page<RouteProps>(({ data }, { params }) => (
      <p>
        {params.orgId}/{data.name}
      </p>
    ));

    const html = renderRoute(<Page params={{ orgId: 'acme' }} />, {
      restricted: false,
      data: { name: 'alpha' },
      companions: {},
    });

    expect(html).toContain('acme');
    expect(html).toContain('alpha');
  });

  test('a gate page hands the route props to render', () => {
    const route = defineResourceRoute({
      type: 'gate',
      restrictedTitle: 'Access restricted',
      restrictedMessage: 'No access.',
    });
    const Page = route.Page<RouteProps>(({ params }) => <p>invite to {params.orgId}</p>);

    const html = renderRoute(<Page params={{ orgId: 'acme' }} />, { restricted: false });

    expect(html).toContain('acme');
  });

  test('a restricted gate page never calls render', () => {
    const route = defineResourceRoute({
      type: 'gate',
      restrictedTitle: 'Access restricted',
      restrictedMessage: 'No access.',
    });
    const Page = route.Page<RouteProps>(({ params }) => <p>invite to {params.orgId}</p>);

    const html = renderRoute(<Page params={{ orgId: 'acme' }} />, { restricted: true });

    expect(html).toContain('Access restricted');
    expect(html).not.toContain('invite to');
  });
});
