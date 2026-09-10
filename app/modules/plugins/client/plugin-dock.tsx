/**
 * `portal.dock/project` widget collection — CLIENT-SAFE.
 *
 * Mirrors `plugin-cards.tsx`'s collect pattern, but returns widget
 * descriptors instead of rendering `Card` shells: the project bottom bar owns
 * the toolbar chrome (button, active state, resize/drag) and only needs an
 * id/title/icon to build its own toolbar button plus a way to render the
 * widget's content on demand.
 */
import type { PluginRemoteRef } from './federation-host';
import { getDockExtensions } from './match-extension';
import { useProjectPlugins } from './use-project-plugins';
import type { DockProjectExtension, PublicPlugin } from '@/modules/plugins/types';
import { useMemo } from 'react';

/** A single plugin-contributed dock widget, ready for the bottom bar to render. */
export interface DockWidgetDescriptor {
  /** Extension-declared id; unique within its plugin, used as the panel key. */
  id: string;
  title: string;
  icon: string;
  plugin: PublicPlugin;
  pluginRef: PluginRemoteRef;
  codeRef: string;
}

function collectDockWidgets(plugins: PublicPlugin[]): DockWidgetDescriptor[] {
  return plugins.flatMap((plugin) => {
    const pluginRef: PluginRemoteRef = {
      remoteName: plugin.manifest.name,
      slug: plugin.slug,
      remoteEntry: plugin.manifest.remoteEntry,
    };
    return getDockExtensions(plugin.manifest).map(
      (dock: DockProjectExtension): DockWidgetDescriptor => ({
        id: dock.properties.id,
        title: dock.properties.title,
        icon: dock.properties.icon,
        plugin,
        pluginRef,
        codeRef: dock.properties.component.$codeRef,
      })
    );
  });
}

/**
 * The `portal.dock/project` widgets available for a project, sourced from
 * every ready plugin's manifest. Returns an empty array until at least one
 * ready plugin declares a dock extension, so callers can render nothing
 * without special-casing.
 */
export function useProjectDockWidgets(projectId: string | undefined): DockWidgetDescriptor[] {
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  return useMemo(() => (plugins ? collectDockWidgets(plugins) : []), [plugins]);
}
