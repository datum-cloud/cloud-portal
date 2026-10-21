import type { PluginRemoteRef } from '@/modules/plugins/client/federation-host';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import type { PublicPlugin } from '@/modules/plugins/types';

/** The Networks plugin's create dialog: module `CreateNetworkDialog`, named export of the same name. */
const CREATE_NETWORK_DIALOG = 'CreateNetworkDialog.CreateNetworkDialog';

/**
 * The Networks plugin's own "Create a network" dialog, opened from the home
 * page so creating a network never means leaving it. Mounted only while open,
 * so the plugin module loads on first use.
 */
export function PluginCreateNetworkDialog({
  plugin,
  projectId,
  open,
  onOpenChange,
}: {
  plugin: PublicPlugin;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;
  const pluginRef: PluginRemoteRef = {
    remoteName: plugin.manifest.name,
    slug: plugin.slug,
    remoteEntry: plugin.manifest.remoteEntry,
  };
  return (
    <PluginErrorBoundary
      slug={plugin.slug}
      displayName={plugin.displayName}
      resetKey={CREATE_NETWORK_DIALOG}>
      <LazyPluginComponent
        pluginRef={pluginRef}
        codeRef={CREATE_NETWORK_DIALOG}
        componentProps={{ projectId, open, onOpenChange, showTrigger: false }}
        fallback={null}
      />
    </PluginErrorBoundary>
  );
}
