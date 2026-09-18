/**
 * `portal.header/project` rendering — CLIENT-SAFE.
 *
 * Renders every ready plugin's header extensions inline, in the persistent
 * top header, just left of the project search entry (see
 * `app/routes/project/detail/layout.tsx`). Unlike project-home cards, there's
 * no title chrome and no heavyweight error fallback — a header hint is small
 * and decorative enough that a broken one should just disappear rather than
 * show a warning card in the global nav.
 */
import type { PluginRemoteRef } from './federation-host';
import { LazyPluginComponent } from './lazy-plugin-component';
import { getHeaderExtensions } from './match-extension';
import { useProjectPlugins } from './use-project-plugins';
import type { HeaderProjectExtension, PublicPlugin } from '@/modules/plugins/types';
import { Component, useMemo, type ReactNode } from 'react';

interface HeaderItem {
  plugin: PublicPlugin;
  pluginRef: PluginRemoteRef;
  header: HeaderProjectExtension;
}

function collectHeaderItems(plugins: PublicPlugin[]): HeaderItem[] {
  return plugins.flatMap((plugin) => {
    const pluginRef: PluginRemoteRef = {
      remoteName: plugin.manifest.name,
      slug: plugin.slug,
      remoteEntry: plugin.manifest.remoteEntry,
    };
    return getHeaderExtensions(plugin.manifest).map((header) => ({ plugin, pluginRef, header }));
  });
}

/**
 * Silently drops a failing header extension instead of the heavyweight
 * warning card `PluginErrorBoundary` shows on plugin pages/cards — this slot
 * is a decorative hint, not critical content, and the global header is the
 * wrong place for a big error state.
 */
class SilentPluginBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/**
 * Plugin-contributed content in the persistent top header. Renders nothing
 * until at least one ready plugin declares a `portal.header/project`
 * extension, so the header is unchanged when no plugins are present.
 */
export function ProjectHeaderPluginContent({ projectId }: { projectId: string }) {
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  const items = useMemo(() => (plugins ? collectHeaderItems(plugins) : []), [plugins]);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {items.map(({ plugin, pluginRef, header }) => (
        <SilentPluginBoundary key={`${plugin.slug}:${header.properties.component.$codeRef}`}>
          <LazyPluginComponent
            pluginRef={pluginRef}
            codeRef={header.properties.component.$codeRef}
            fallback={null}
          />
        </SilentPluginBoundary>
      ))}
    </div>
  );
}
