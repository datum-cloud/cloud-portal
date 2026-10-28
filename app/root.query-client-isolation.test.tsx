import AppWithProviders from './root';
import type { Organization, OrganizationList } from '@/resources/organizations';
import { useOrganizations } from '@/resources/organizations/organization.queries';
import { describe, expect, it } from 'bun:test';
import { PassThrough } from 'node:stream';
import { Suspense, use } from 'react';
import { renderToString } from 'react-dom/server';
// Same renderer as entry.server.tsx; see the comment there for why `.node`.
import { renderToPipeableStream } from 'react-dom/server.node';
import { createRoutesStub, useLoaderData } from 'react-router';

/**
 * Two sequential server renders for two different users, through the real
 * root component (its QueryClientProvider wiring) and the real
 * `useOrganizations` hook. The child route seeds the cache with
 * `initialData` during render, the same way account/billing/index.tsx does.
 * Each user's HTML must only contain that user's organizations.
 */

function orgList(...names: string[]): OrganizationList {
  return {
    items: names.map((name) => ({ name, displayName: name }) as Organization),
    hasMore: false,
  } as OrganizationList;
}

function OrgListPage() {
  const { organizations } = useLoaderData<{ organizations: OrganizationList }>();
  const query = useOrganizations(undefined, {
    initialData: organizations,
    initialDataUpdatedAt: Date.now(),
  });
  return (
    <ul>
      {(query.data ?? organizations).items.map((org) => (
        <li key={org.name}>{org.name}</li>
      ))}
    </ul>
  );
}

function renderRequestFor(organizations: OrganizationList): string {
  const Stub = createRoutesStub([
    {
      id: 'root',
      path: '/',
      Component: AppWithProviders,
      children: [{ id: 'orgs', index: true, Component: OrgListPage }],
    },
  ]);
  return renderToString(
    <Stub
      initialEntries={['/']}
      hydrationData={{
        loaderData: {
          root: { toast: null, csrfToken: 'csrf', ENV: {}, sidebarOpen: undefined },
          orgs: { organizations },
        },
      }}
    />
  );
}

function renderedOrgNames(html: string): string[] {
  return [...html.matchAll(/<li>([^<]*)<\/li>/g)].map((match) => match[1]);
}

type StreamedLoaderData = { organizations: OrganizationList; gate: Promise<void> };

/** Reads the org list after suspending, with initialData that must never win. */
function OrgListAfterGate({ gate }: { gate: Promise<void> }) {
  use(gate);
  const query = useOrganizations(undefined, { initialData: orgList('not-this-request') });
  return (
    <ul>
      {query.data?.items.map((org) => (
        <li key={org.name}>{org.name}</li>
      ))}
    </ul>
  );
}

/** Seeds the cache before a Suspense boundary, then reads it back inside it. */
function StreamedOrgListPage() {
  const { organizations, gate } = useLoaderData<StreamedLoaderData>();
  useOrganizations(undefined, { initialData: organizations, initialDataUpdatedAt: Date.now() });
  return (
    <Suspense fallback={null}>
      <OrgListAfterGate gate={gate} />
    </Suspense>
  );
}

/** Streams one request the way entry.server.tsx does, resolving on shell and on completion. */
function streamRequestFor(organizations: OrganizationList, gate: Promise<void>) {
  const Stub = createRoutesStub([
    {
      id: 'root',
      path: '/',
      Component: AppWithProviders,
      children: [{ id: 'orgs', index: true, Component: StreamedOrgListPage }],
    },
  ]);
  let shellReady!: () => void;
  const shell = new Promise<void>((resolve) => (shellReady = resolve));
  const html = new Promise<string>((resolve, reject) => {
    const { pipe } = renderToPipeableStream(
      <Stub
        initialEntries={['/']}
        hydrationData={{
          loaderData: {
            root: { toast: null, csrfToken: 'csrf', ENV: {}, sidebarOpen: undefined },
            orgs: { organizations, gate },
          },
        }}
      />,
      {
        onShellReady: shellReady,
        onAllReady() {
          const body = new PassThrough();
          const chunks: Buffer[] = [];
          body.on('data', (chunk: Buffer) => chunks.push(chunk));
          body.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          pipe(body);
        },
        onShellError: reject,
      }
    );
  });
  return { shell, html };
}

describe('root QueryClient on the server', () => {
  it('does not render one user’s cached organizations into the next user’s HTML', () => {
    const aliceHtml = renderRequestFor(orgList('alice-org'));
    const bobHtml = renderRequestFor(orgList('bob-org'));

    expect(renderedOrgNames(aliceHtml)).toEqual(['alice-org']);
    expect(renderedOrgNames(bobHtml)).toEqual(['bob-org']);
  });

  it('keeps each streamed request on its own cache while another request renders mid-suspense', async () => {
    let openAliceGate!: () => void;
    const aliceGate = new Promise<void>((resolve) => (openAliceGate = resolve));

    // Alice seeds her cache, then suspends; Bob renders start to finish in between.
    const alice = streamRequestFor(orgList('alice-org'), aliceGate);
    await alice.shell;
    const bob = streamRequestFor(orgList('bob-org'), Promise.resolve());
    const bobHtml = await bob.html;
    openAliceGate();
    const aliceHtml = await alice.html;

    expect(renderedOrgNames(aliceHtml)).toEqual(['alice-org']);
    expect(renderedOrgNames(bobHtml)).toEqual(['bob-org']);
  });
});
