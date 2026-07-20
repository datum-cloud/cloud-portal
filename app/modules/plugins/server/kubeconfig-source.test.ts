/// <reference types="bun-types/test" />
import { KubeClient, resolveKubeContext, parseKubeconfig } from './kubeconfig';
import { KubeconfigSource, specFromResource } from './kubeconfig-source';
import { PluginRegistry } from './registry';
import { describe, expect, mock, test } from 'bun:test';

const VALID_MANIFEST = {
  name: 'compute.miloapis.com',
  version: '1.4.0',
  sdk: { name: '@datum-cloud/portal-plugin-sdk', range: '^1.0.0' },
  remoteEntry: 'remote-entry.js',
  exposedModules: { InstanceList: './src/pages/instance-list.tsx' },
  extensions: [
    {
      type: 'portal.page/project',
      properties: { path: 'instances', component: { $codeRef: 'InstanceList' } },
    },
  ],
};

const NO_AUTH_KUBECONFIG = `
apiVersion: v1
kind: Config
current-context: kwok
clusters:
- name: c
  cluster:
    server: http://127.0.0.1:8080
contexts:
- name: kwok
  context: { cluster: c, user: u }
users:
- name: u
  user: {}
`;

function portalPluginResource(
  spec: Record<string, unknown> = {},
  meta: { generation?: number; resourceVersion?: string } = {},

  status?: { conditions?: any[] }
) {
  return {
    metadata: {
      name: 'compute.miloapis.com',
      generation: meta.generation ?? 1,
      resourceVersion: meta.resourceVersion ?? '100',
    },
    spec: {
      slug: 'compute',
      serviceName: 'compute.miloapis.com',
      displayName: 'Compute',
      deprecated: false,
      suspend: false,
      assets: { baseURL: 'http://plugin.example.com' },
      visibility: { entitlement: 'Required' },
      ...spec,
    },
    ...(status ? { status } : {}),
  };
}

/** The status.conditions block the source writes for the valid fixture (Ready). */

function readyConditions(patchBody: string): any[] {
  return JSON.parse(patchBody).status.conditions;
}

/** A registry whose manifest pipeline always resolves the valid fixture. */
function makeRegistry() {
  const fetchImpl = mock(async () => new Response(JSON.stringify(VALID_MANIFEST), { status: 200 }));
  const registry = new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
  return { registry, fetchImpl };
}

/** A KubeClient whose requests (status patches) always succeed. */
function makeClient() {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = mock(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response('{}', { status: 200 });
  });
  const client = new KubeClient(resolveKubeContext(parseKubeconfig(NO_AUTH_KUBECONFIG)), {
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, calls };
}

const silentLogger = { warn: mock(() => {}), info: mock(() => {}), error: mock(() => {}) };

describe('specFromResource', () => {
  test('maps a resource spec with defaults applied', () => {
    const spec = specFromResource(portalPluginResource());
    expect(spec).not.toBeNull();
    expect(spec!.slug).toBe('compute');
    expect(spec!.assets.manifestPath).toBe('/plugin-manifest.json');
    expect(spec!.visibility.entitlement).toBe('Required');
  });

  test('returns null when slug or assets.baseURL is missing', () => {
    expect(specFromResource({ spec: { slug: 'x' } })).toBeNull();
    expect(specFromResource({ spec: { assets: { baseURL: 'http://x' } } })).toBeNull();
  });
});

describe('KubeconfigSource.applyWatchEvent', () => {
  test('ADDED reduces into a servable registry entry', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });

    const plugin = registry.getPlugin('compute');
    expect(plugin).toBeDefined();
    expect(plugin?.source).toBe('kubeconfig');
    expect(plugin?.devMode).toBe(false);
    expect(plugin?.manifest?.version).toBe('1.4.0');
  });

  test('best-effort PATCHes the status subresource', async () => {
    const { registry } = makeRegistry();
    const { client, calls } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });

    const patch = calls.find((c) => c.url.endsWith('/portalplugins/compute.miloapis.com/status'));
    expect(patch).toBeDefined();
    expect(patch?.init.method).toBe('PATCH');
    const body = JSON.parse(patch!.init.body as string);
    expect(
      body.status.conditions.some((cond: any) => cond.type === 'Ready' && cond.status === 'True')
    ).toBe(true);
  });

  test('spec-only MODIFIED hot-applies the new spec (entitlement flip)', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });
    expect(registry.getPlugin('compute')?.spec.visibility.entitlement).toBe('Required');

    // Patch entitlement Required → None (a new generation).
    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: portalPluginResource(
        { visibility: { entitlement: 'None' } },
        { generation: 2, resourceVersion: '200' }
      ),
    });

    // The served entry reflects the change immediately — no stale spec.
    expect(registry.getPlugin('compute')?.spec.visibility.entitlement).toBe('None');
  });

  test('suspend kill switch takes effect within one watch event, and un-suspend restores', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });
    expect(registry.getPlugin('compute')).toBeDefined();

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: portalPluginResource({ suspend: true }, { generation: 2, resourceVersion: '200' }),
    });
    expect(registry.getPlugin('compute')).toBeUndefined();

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: portalPluginResource({ suspend: false }, { generation: 3, resourceVersion: '300' }),
    });
    expect(registry.getPlugin('compute')).toBeDefined();
  });

  test('ignores a status-only MODIFIED (spec unchanged) — breaks the reconcile feedback loop', async () => {
    const { registry, fetchImpl } = makeRegistry();
    const { client, calls } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });
    const fetchesAfterAdd = fetchImpl.mock.calls.length;
    const patchesAfterAdd = calls.filter((c) => c.init.method === 'PATCH').length;
    expect(patchesAfterAdd).toBe(1); // ADDED wrote status once

    // The apiserver echoes our own status write back as a MODIFIED event: same
    // spec, only status changed. Must be a no-op regardless of generation.
    const writtenConditions = readyConditions(
      calls.find((c) => c.init.method === 'PATCH')!.init.body as string
    );
    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: portalPluginResource(
        {},
        { generation: 1, resourceVersion: '101' },
        { conditions: writtenConditions }
      ),
    });

    // No re-fetch of the manifest, no redundant status patch → loop is broken.
    expect(fetchImpl.mock.calls.length).toBe(fetchesAfterAdd);
    expect(calls.filter((c) => c.init.method === 'PATCH').length).toBe(patchesAfterAdd);
  });

  test('applies a spec change even when metadata.generation does NOT bump (robust to generation semantics)', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });
    expect(registry.getPlugin('compute')?.spec.suspend).toBe(false);

    // Suspend the plugin but keep generation pinned at 1 — the reduction keys on
    // spec content, so it must still take effect.
    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: portalPluginResource({ suspend: true }, { generation: 1, resourceVersion: '150' }),
    });
    expect(registry.getPlugin('compute')).toBeUndefined();
  });

  test('a spec change that does not alter conditions reconciles but skips a redundant status patch', async () => {
    const { registry } = makeRegistry();
    const { client, calls } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });
    const writtenConditions = readyConditions(
      calls.find((c) => c.init.method === 'PATCH')!.init.body as string
    );
    const patchesAfterAdd = calls.filter((c) => c.init.method === 'PATCH').length;

    // Flip `deprecated` (new generation) — the spec applies, but Ready/Discovered/
    // Compatible are unchanged, so no new status patch should be written.
    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: portalPluginResource(
        { deprecated: true },
        { generation: 2, resourceVersion: '200' },
        { conditions: writtenConditions }
      ),
    });

    expect(registry.getPlugin('compute')?.spec.deprecated).toBe(true); // spec applied
    expect(calls.filter((c) => c.init.method === 'PATCH').length).toBe(patchesAfterAdd); // no churn
  });

  test('DELETED removes the plugin from the registry', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: portalPluginResource() });
    expect(registry.getPlugin('compute')).toBeDefined();

    await source.applyWatchEvent({
      type: 'DELETED',
      object: { metadata: { name: 'compute.miloapis.com' }, spec: { slug: 'compute' } },
    });
    expect(registry.getPlugin('compute')).toBeUndefined();
  });

  test('ERROR event throws to trigger a re-list', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new KubeconfigSource(registry, client, { logger: silentLogger });

    await expect(
      source.applyWatchEvent({ type: 'ERROR', object: { code: 410, message: 'too old' } })
    ).rejects.toThrow();
  });
});
