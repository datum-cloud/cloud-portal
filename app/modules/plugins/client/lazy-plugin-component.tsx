/**
 * Shared lazy loader for plugin components (pages and cards) — CLIENT-ONLY.
 *
 * Plugin bundles are client-rendered: the server emits the fallback and the
 * plugin hydrates on the client (see the enhancement's SSR note). The post-mount
 * gate keeps Module Federation's `loadRemote` from ever running during the
 * server render, and the initial client render matches the server's fallback so
 * there is no hydration mismatch.
 *
 * Loading uses React 19's `use()` over a module-level promise cache rather than
 * a render-created `React.lazy`, so component identity is stable and no
 * component is constructed during render.
 */
import { loadPluginComponent, type PluginRemoteRef } from './federation-host';
import { Suspense, use, useEffect, useState, type ComponentType, type ReactNode } from 'react';

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
 * during SSR, before mount, and while the bundle loads. Must be rendered inside
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{fallback}</>;

  return (
    <Suspense fallback={fallback}>
      <ResolvedPluginComponent pluginRef={pluginRef} codeRef={codeRef} />
    </Suspense>
  );
}
