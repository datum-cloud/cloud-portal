/**
 * `portal.column/project-home` selection — CLIENT-SAFE.
 *
 * Plugin columns sit in the project home page's row of resource lists. The
 * host draws each column's heading, loading skeleton and error boundary (see
 * `features/project/home/plugin-column.tsx`); the plugin's lazy-loaded
 * component renders only the body.
 */
import type { PluginRemoteRef } from './federation-host';
import { getColumnExtensions } from './match-extension';
import { useActiveServiceEntitlements } from './use-active-service-entitlements';
import { useProjectPlugins } from './use-project-plugins';
import type { ColumnProjectHomeExtension, PublicPlugin } from '@/modules/plugins/types';
import { useMemo } from 'react';

export interface HomeColumn {
  plugin: PublicPlugin;
  pluginRef: PluginRemoteRef;
  column: ColumnProjectHomeExtension;
}

/**
 * Every plugin's project-home columns, in plugin order and then each plugin's
 * own `order`. A column that declares `requirements.serviceRef` is skipped
 * until the project has a matching Active ServiceEntitlement; columns without
 * one always render, so a plugin can show its own "enable" state.
 */
export function collectHomeColumns(
  plugins: readonly PublicPlugin[],
  activeServices: ReadonlySet<string>
): HomeColumn[] {
  return plugins.flatMap((plugin) => {
    const pluginRef: PluginRemoteRef = {
      remoteName: plugin.manifest.name,
      slug: plugin.slug,
      remoteEntry: plugin.manifest.remoteEntry,
    };
    return getColumnExtensions(plugin.manifest)
      .filter((column) => {
        const serviceRef = column.requirements?.serviceRef?.trim();
        return !serviceRef || activeServices.has(serviceRef);
      })
      .map((column) => ({ plugin, pluginRef, column }));
  });
}

/** Plugin columns for the project home page, and whether they are still loading. */
export function useProjectHomePluginColumns(projectId: string): {
  columns: HomeColumn[];
  isLoading: boolean;
} {
  const { data: plugins, isLoading: pluginsLoading } = useProjectPlugins(projectId, {
    enabled: !!projectId,
  });
  const { data: activeServiceEntitlements, isLoading: entitlementsLoading } =
    useActiveServiceEntitlements(projectId, { enabled: !!projectId });

  const columns = useMemo(
    () => collectHomeColumns(plugins ?? [], new Set(activeServiceEntitlements ?? [])),
    [plugins, activeServiceEntitlements]
  );

  return { columns, isLoading: pluginsLoading || entitlementsLoading };
}
