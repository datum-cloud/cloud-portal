import { useSyncExternalStore } from 'react';

function subscribeHydrated(): () => void {
  return () => {};
}

/**
 * False while rendering the server HTML and during the hydration render; true
 * on every client render after hydration.
 *
 * Gate anything the server can't know on it — query results, for one: the
 * server never runs queries, but by the time a subtree hydrates, a query
 * another component started may already have resolved, and rendering that
 * data in the hydration pass fails hydration. Unlike a mount effect, client
 * renders after hydration see `true` immediately, so navigations don't flash
 * the server state.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydrated,
    () => true,
    () => false
  );
}
