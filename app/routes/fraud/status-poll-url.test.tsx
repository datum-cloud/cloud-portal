// @vitest-environment jsdom
import VerifyEmailPage from './verify-email';
import VerifyingPage from './verifying';
import { paths } from '@/utils/config/paths.config';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/layouts/blank.layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Loader-only imports. The pages are rendered here, their loaders are not run.
vi.mock('@/utils/auth/require-session.server', () => ({ requireSessionSub: vi.fn() }));
vi.mock('@/resources/users', () => ({ createUserService: vi.fn() }));

describe('fraud status poll URL', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Never settles, so each page makes its first request and then waits.
    fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function polledUrl(page: ReactNode): string {
    act(() => {
      root.render(<MemoryRouter>{page}</MemoryRouter>);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return fetchMock.mock.calls[0][0] as string;
  }

  it('/verifying reads the status without a token refresh', () => {
    const url = new URL(polledUrl(<VerifyingPage />), 'https://portal.test');

    expect(url.pathname).toBe(paths.fraud.statusApi);
    expect(url.searchParams.get('refresh')).toBe('0');
  });

  it('/verify-email keeps the refresh, which is what surfaces a verified address', () => {
    const url = new URL(polledUrl(<VerifyEmailPage />), 'https://portal.test');

    expect(url.pathname).toBe(paths.fraud.statusApi);
    expect(url.searchParams.has('refresh')).toBe(false);
  });
});
