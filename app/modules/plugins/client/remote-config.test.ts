import {
  buildPluginRemote,
  PLUGIN_REMOTE_ENTRY_TYPE,
  remoteEntryUrl,
  type PluginRemoteRef,
} from './federation-host';
import { describe, expect, it } from 'bun:test';

const ref: PluginRemoteRef = {
  remoteName: 'sample.miloapis.com',
  slug: 'sample',
  remoteEntry: 'remoteEntry.js',
};

describe('buildPluginRemote', () => {
  // Regression guard: plugin remote entries are ES modules, so the descriptor
  // MUST declare `type: 'module'`. Without it the runtime loads the entry as a
  // classic <script> and throws "Cannot use import statement outside a module",
  // breaking every plugin (caught in e2e, fixed here). Do not relax this.
  it("declares type 'module' so ESM remote entries load via dynamic import", () => {
    expect(buildPluginRemote(ref).type).toBe('module');
    expect(PLUGIN_REMOTE_ENTRY_TYPE).toBe('module');
  });

  it('keys the descriptor by the MF container name (manifest name)', () => {
    expect(buildPluginRemote(ref).name).toBe('sample.miloapis.com');
  });

  it('points the entry at the same-origin asset proxy, not the plugin origin', () => {
    expect(buildPluginRemote(ref).entry).toBe('/api/plugins/sample/remoteEntry.js');
  });
});

describe('remoteEntryUrl', () => {
  it('builds the slug-scoped asset-proxy URL', () => {
    expect(remoteEntryUrl('compute', 'remote-entry.js')).toBe(
      '/api/plugins/compute/remote-entry.js'
    );
  });

  it('tolerates a leading slash on the remote entry filename', () => {
    expect(remoteEntryUrl('compute', '/remote-entry.js')).toBe(
      '/api/plugins/compute/remote-entry.js'
    );
  });
});
