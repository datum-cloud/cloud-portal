/**
 * Shared lazy loader for plugin components (pages and cards) — CLIENT-ONLY.
 *
 * Plugin bundles are client-rendered: the server emits the fallback and the
 * plugin hydrates on the client (see the enhancement's SSR note). The hydration
 * snapshot keeps Module Federation's `loadRemote` from ever running during the
 * server render, and the hydration render matches the server's fallback so
 * there is no hydration mismatch. On the client, that same render starts the
 * fetch so it overlaps hydration instead of waiting for an effect.
 *
 * Loading uses React 19's `use()` over a module-level promise cache rather than
 * a render-created `React.lazy`, so component identity is stable and no
 * component is constructed during render.
 *
 * The SSR gate is a hydration snapshot, not a mount effect. A mount effect
 * paints the fallback on every client navigation — including when the bundle
 * is already cached — and that frame shows up before the plugin's own
 * skeleton. After hydration, client renders skip the fallback and suspend
 * only while the bundle is actually in flight.
 */
import { loadPluginComponent, type PluginRemoteRef } from './federation-host';
import { Suspense, use, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';

function subscribeHydrated(): () => void {
  return () => {};
}

/** False while rendering the server HTML; true on every client render after hydration. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydrated,
    () => true,
    () => false
  );
}

/**
 * Cache of in-flight/resolved plugin component promises, keyed by container
 * name + code ref. Module-level so the promise identity is stable across
 * renders (a requirement of `use()`) and survives remounts.
 */
const componentPromiseCache = new Map<string, Promise<ComponentType<unknown>>>();

function getComponentPromise(
  ref: PluginRemoteRef,
  codeRef: string
): Promise<ComponentType<unknown>> {
  const key = `${ref.remoteName}::${codeRef}`;
  const cached = componentPromiseCache.get(key);
  if (cached) return cached;

  const promise = loadPluginComponent(ref, codeRef).catch((error: unknown) => {
    // Evict a failed load so a retry (error-boundary reset or re-navigation)
    // re-attempts the load instead of re-throwing the same rejection forever.
    componentPromiseCache.delete(key);
    throw error;
  });
  componentPromiseCache.set(key, promise);
  return promise;
}

function ResolvedPluginComponent({
  pluginRef,
  codeRef,
}: {
  pluginRef: PluginRemoteRef;
  codeRef: string;
}) {
  const Component = use(getComponentPromise(pluginRef, codeRef));
  // Rendering a runtime-resolved component is the whole point of the plugin
  // system; the module-level promise cache keeps this identity stable, which
  // `react-hooks/static-components` cannot infer — hence the scoped disable.
  // eslint-disable-next-line react-hooks/static-components
  return <Component />;
}

/**
 * Lazily load and render a plugin component by `$codeRef`, showing `fallback`
 * during SSR, hydration, and while the bundle loads. Must be rendered inside
 * a plugin ErrorBoundary — a load or render failure throws to it.
 */
export function LazyPluginComponent({
  pluginRef,
  codeRef,
  fallback,
}: {
  pluginRef: PluginRemoteRef;
  codeRef: string;
  fallback: ReactNode;
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    if (typeof window !== 'undefined') {
      // Failure is retried when the hydrated render suspends on the same load.
      void getComponentPromise(pluginRef, codeRef).catch(() => {});
    }
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      <ResolvedPluginComponent pluginRef={pluginRef} codeRef={codeRef} />
    </Suspense>
  );
}
