import AppWithProviders, { ErrorBoundary } from './root';
import { ENV_SCRIPT_ID, NonceProvider } from '@/hooks/useNonce';
import { renderToString } from 'react-dom/server';
import { createRoutesStub } from 'react-router';
import { describe, expect, it } from 'vitest';

/**
 * Server renders of both document shells. The theme provider's inline script
 * must land inside <body> with the request's nonce: above <html> it falls
 * outside the document and fails hydration, and without the nonce the CSP
 * blocks it. The client reads the nonce back from root's ENV script, so that
 * one must carry it on both shells too.
 */

const NONCE = 'test-nonce';

const ROOT_DATA = { toast: null, csrfToken: 'csrf', ENV: {}, sidebarOpen: undefined };

function renderApp(): string {
  const Stub = createRoutesStub([
    {
      id: 'root',
      path: '/',
      Component: AppWithProviders,
      ErrorBoundary,
      children: [{ id: 'page', index: true, Component: () => <p>page</p> }],
    },
  ]);
  return renderToString(
    <NonceProvider value={NONCE}>
      <Stub initialEntries={['/']} hydrationData={{ loaderData: { root: ROOT_DATA } }} />
    </NonceProvider>
  );
}

function renderError(): string {
  const Stub = createRoutesStub([
    { id: 'root', path: '/', Component: AppWithProviders, ErrorBoundary },
  ]);
  return renderToString(
    <NonceProvider value={NONCE}>
      <Stub initialEntries={['/']} hydrationData={{ errors: { root: new Error('boom') } }} />
    </NonceProvider>
  );
}

/** The opening tag of the theme provider's script, found by its body. */
function themeScriptTag(html: string): { tag: string; index: number } | undefined {
  const match = /<script[^>]*>\(function script\(attribute, storageKey/.exec(html);
  return match ? { tag: match[0], index: match.index } : undefined;
}

describe.each([
  ['the app shell', renderApp],
  ['the error shell', renderError],
])('%s', (_, render) => {
  const html = render();

  it('renders the theme script inside <body>', () => {
    const theme = themeScriptTag(html);
    expect(theme).toBeDefined();
    expect(html.startsWith('<html')).toBe(true);
    expect(theme!.index).toBeGreaterThan(html.indexOf('<body'));
  });

  it('gives the theme script the request nonce', () => {
    expect(themeScriptTag(html)?.tag).toContain(`nonce="${NONCE}"`);
  });

  it('gives every script the request nonce', () => {
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) expect(tag).toContain(`nonce="${NONCE}"`);
  });

  it('renders the ENV script the client reads the nonce from', () => {
    expect(html).toContain(`<script id="${ENV_SCRIPT_ID}" nonce="${NONCE}">`);
  });
});
