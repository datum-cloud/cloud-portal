/// <reference types="bun-types/test" />
import type { PortalPluginSpec } from '../types';
import { PluginRegistry } from './registry';
import { describe, expect, mock, test } from 'bun:test';

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    name: 'compute.miloapis.com',
    version: '1.0.0',
    sdk: { name: '@datum-cloud/portal-plugin-sdk', range: '^1.0.0' },
    remoteEntry: 'remote-entry.js',
    exposedModules: { InstanceList: './src/pages/instance-list.tsx' },
    extensions: [
      {
        type: 'portal.page/project',
        properties: { path: 'instances', component: { $codeRef: 'InstanceList' } },
      },
    ],
    ...overrides,
  };
}

function spec(overrides: Partial<PortalPluginSpec> = {}): PortalPluginSpec {
  return {
    slug: 'compute',
    displayName: 'Compute',
    deprecated: false,
    suspend: false,
    assets: { baseURL: 'http://plugin.example.com', manifestPath: '/plugin-manifest.json' },
    proxy: [],
    visibility: { entitlement: 'None' },
    ...overrides,
  };
}

/** Serves a manifest body keyed by base URL so different specs get different manifests. */
function registryServing(byBaseUrl: Record<string, unknown>) {
  const fetchImpl = mock(async (url: string) => {
    for (const [base, body] of Object.entries(byBaseUrl)) {
      if (url.startsWith(base)) return new Response(JSON.stringify(body), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  });
  return new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
}

describe('PluginRegistry', () => {
  test('serves a Ready plugin after upsert', async () => {
    const registry = registryServing({ 'http://plugin.example.com': manifest() });
    await registry.upsert('kubeconfig', spec(), false);

    expect(registry.getPlugin('compute')).toBeDefined();
    expect(registry.getPlugins()).toHaveLength(1);
  });

  test('excludes suspended plugins from the servable view', async () => {
    const registry = registryServing({ 'http://plugin.example.com': manifest() });
    await registry.upsert('kubeconfig', spec({ suspend: true }), false);

    expect(registry.getPlugin('compute')).toBeUndefined();
    expect(registry.getPlugins()).toHaveLength(0);
    // The entry is still tracked for status reporting.
    expect(registry.entriesForSource('kubeconfig')).toHaveLength(1);
  });

  test('excludes SDK-incompatible plugins from the servable view', async () => {
    const registry = registryServing({
      'http://plugin.example.com': manifest({ sdk: { name: 'x', range: '^2.0.0' } }),
    });
    await registry.upsert('kubeconfig', spec(), false);

    expect(registry.getPlugin('compute')).toBeUndefined();
    const entry = registry.entriesForSource('kubeconfig')[0];
    expect(
      entry.status.conditions.some((c) => c.type === 'Compatible' && c.status === 'False')
    ).toBe(true);
  });

  test('excludes plugins with an unfetchable manifest', async () => {
    const registry = registryServing({}); // every fetch 404s
    await registry.upsert('static', spec(), true);

    expect(registry.getPlugin('compute')).toBeUndefined();
    const entry = registry.entriesForSource('static')[0];
    expect(
      entry.status.conditions.some((c) => c.type === 'Discovered' && c.status === 'False')
    ).toBe(true);
  });

  test('static source wins over kubeconfig on slug collision', async () => {
    const registry = registryServing({
      'http://static.example.com': manifest({ version: '9.9.9' }),
      'http://cluster.example.com': manifest({ version: '1.0.0' }),
    });
    await registry.upsert(
      'kubeconfig',
      spec({
        assets: { baseURL: 'http://cluster.example.com', manifestPath: '/plugin-manifest.json' },
      }),
      false
    );
    await registry.upsert(
      'static',
      spec({
        assets: { baseURL: 'http://static.example.com', manifestPath: '/plugin-manifest.json' },
      }),
      true
    );

    const plugin = registry.getPlugin('compute');
    expect(plugin?.source).toBe('static');
    expect(plugin?.manifest?.version).toBe('9.9.9');
  });

  test('removing the static override falls back to the kubeconfig entry', async () => {
    const registry = registryServing({
      'http://static.example.com': manifest({ version: '9.9.9' }),
      'http://cluster.example.com': manifest({ version: '1.0.0' }),
    });
    await registry.upsert(
      'kubeconfig',
      spec({
        assets: { baseURL: 'http://cluster.example.com', manifestPath: '/plugin-manifest.json' },
      }),
      false
    );
    await registry.upsert(
      'static',
      spec({
        assets: { baseURL: 'http://static.example.com', manifestPath: '/plugin-manifest.json' },
      }),
      true
    );

    registry.remove('static', 'compute');

    const plugin = registry.getPlugin('compute');
    expect(plugin?.source).toBe('kubeconfig');
    expect(plugin?.manifest?.version).toBe('1.0.0');
  });
});
