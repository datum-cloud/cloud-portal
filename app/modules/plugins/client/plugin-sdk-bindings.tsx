/**
 * Real implementations behind `@datum-cloud/portal-plugin-sdk`'s three hooks
 * — CLIENT-ONLY. This is the piece that turns the SDK from a contract into
 * something that actually works: it reads the host's own project state,
 * proxy client, and watch manager, and exposes them through the SDK's
 * `PortalPluginHostBindings` shape via `PortalPluginHostProvider`.
 *
 * Mount `<PortalPluginHostProvider bindings={pluginHostBindings}>` around
 * whatever renders plugin content (currently the project layout, which covers
 * plugin pages, dock widgets, and home cards in one place — see
 * app/routes/project/detail/layout.tsx).
 */
import { useResourceWatch as useHostResourceWatch } from '@/modules/watch/use-resource-watch';
import { useOptionalProjectContext } from '@/providers/project.provider';
import { getProjectScopedBase } from '@/resources/base/utils';
import type {
  PluginFetch,
  PluginProjectContextValue,
  PluginWatchEvent,
  UseResourceWatchOptions,
  UseResourceWatchResult,
} from '@datum-cloud/portal-plugin-sdk';
import type { PortalPluginHostBindings } from '@datum-cloud/portal-plugin-sdk/host';
import { useCallback, useMemo, useState } from 'react';

function useProjectContextBinding(): PluginProjectContextValue {
  const ctx = useOptionalProjectContext();
  if (!ctx) {
    // Rendered outside a ProjectProvider (shouldn't happen — plugins only
    // ever mount inside the project layout) — degrade rather than throw.
    return { project: undefined, org: undefined, isLoading: false, error: null };
  }
  return {
    project: ctx.project ? { name: ctx.project.name, displayName: ctx.project.displayName } : undefined,
    org: ctx.org ? { name: ctx.org.name, displayName: ctx.org.displayName } : undefined,
    isLoading: ctx.isLoading,
    error: ctx.error,
  };
}

function usePluginFetchBinding(): PluginFetch {
  const ctx = useOptionalProjectContext();
  const projectName = ctx?.project?.name;

  return useCallback<PluginFetch>(
    async (path, init) => {
      if (!projectName) {
        throw new Error('usePluginFetch() called with no active project in context.');
      }
      // getProjectScopedBase already resolves to '/api/proxy/apis/resourcemanager
      // .../projects/{id}/control-plane' client-side (see resources/base/utils.ts)
      // — the same prefix every built-in resource service uses. `path` is just
      // the K8s API path the plugin cares about, e.g.
      // '/apis/compute.miloapis.com/v1alpha1/namespaces/default/workloads'.
      const base = getProjectScopedBase(projectName);
      return fetch(`${base}${path}`, { ...init, credentials: 'include' });
    },
    [projectName]
  );
}

function useResourceWatchBinding<T = unknown>(
  options: UseResourceWatchOptions<T>
): UseResourceWatchResult<T> {
  const ctx = useOptionalProjectContext();
  const projectId = ctx?.project?.name;
  const enabled = (options.enabled ?? true) && !!projectId;

  const [lastEvent, setLastEvent] = useState<PluginWatchEvent<T> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Never read back — this queryKey only gives the host's watch hook (which
  // is built around React Query cache updates) somewhere to write to. The
  // plugin gets its data through `lastEvent`/`onEvent` below instead.
  const queryKey = useMemo(
    () =>
      [
        'plugin-watch',
        projectId,
        options.resourceType,
        options.namespace,
        options.name,
        options.labelSelector,
        options.fieldSelector,
      ] as const,
    [
      projectId,
      options.resourceType,
      options.namespace,
      options.name,
      options.labelSelector,
      options.fieldSelector,
    ]
  );

  useHostResourceWatch<T>({
    resourceType: options.resourceType,
    projectId,
    namespace: options.namespace ?? 'default',
    name: options.name,
    labelSelector: options.labelSelector,
    fieldSelector: options.fieldSelector,
    enabled,
    transform: options.transform,
    queryKey,
    onEvent: (event) => {
      if (event.type === 'ERROR') {
        setError(new Error('Plugin resource watch error'));
      } else {
        setLastEvent(event);
      }
      options.onEvent?.(event);
    },
  });

  // `isConnected` reflects an active, error-free subscription — the
  // underlying WatchManager multiplexes one SSE connection per browser tab
  // and doesn't expose per-channel socket state, so this is "subscribed", not
  // "the socket is currently open".
  return { lastEvent, isConnected: enabled && !error, error };
}

export const pluginHostBindings: PortalPluginHostBindings = {
  useProjectContext: useProjectContextBinding,
  usePluginFetch: usePluginFetchBinding,
  useResourceWatch: useResourceWatchBinding,
};
