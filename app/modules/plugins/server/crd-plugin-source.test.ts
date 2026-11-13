import {
  CONSUMER_PORTAL_PLUGIN_GROUP,
  CONSUMER_PORTAL_PLUGIN_PLURAL,
  CONSUMER_PORTAL_PLUGIN_VERSION,
  PORTAL_PLUGIN_GROUP,
  PORTAL_PLUGIN_PLURAL,
  PORTAL_PLUGIN_VERSION,
} from '../types';
import type { CrdPluginSource, CrdPluginSourceOptions } from './crd-plugin-source';
import { KubeClient, parseKubeconfig, resolveKubeContext } from './kubeconfig';
import { KubeconfigSource } from './kubeconfig-source';
import { PlatformSource } from './platform-source';
import { PluginRegistry } from './registry';
import { afterEach, describe, expect, test, vi } from 'vitest';

/**
 * Drives the shared list/watch/reconcile loop end to end, through `start()`,
 * against a fake API server whose watch stream the test writes to. Every case
 * runs against both sources, so the two stay behaviourally identical.
 */

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
current-context: milo
clusters:
- name: c
  cluster:
    server: http://127.0.0.1:8080
contexts:
- name: milo
  context: { cluster: c, user: u }
users:
- name: u
  user: {}
`;

const LIST_RESOURCE_VERSION = '10';
const RESOURCE_NAME = 'compute.miloapis.com';

const SOURCES = [
  {
    label: 'PlatformSource',
    registrySource: 'platform',
    resourcePath: `/apis/${CONSUMER_PORTAL_PLUGIN_GROUP}/${CONSUMER_PORTAL_PLUGIN_VERSION}/${CONSUMER_PORTAL_PLUGIN_PLURAL}`,
    create: (registry: PluginRegistry, client: KubeClient, options: CrdPluginSourceOptions) =>
      new PlatformSource(registry, client, options),
  },
  {
    label: 'KubeconfigSource',
    registrySource: 'kubeconfig',
    resourcePath: `/apis/${PORTAL_PLUGIN_GROUP}/${PORTAL_PLUGIN_VERSION}/${PORTAL_PLUGIN_PLURAL}`,
    create: (registry: PluginRegistry, client: KubeClient, options: CrdPluginSourceOptions) =>
      new KubeconfigSource(registry, client, options),
  },
] as const;

function pluginResource(
  spec: Record<string, unknown> = {},
  meta: { name?: string; resourceVersion?: string } = {}
) {
  return {
    metadata: {
      name: meta.name ?? RESOURCE_NAME,
      generation: 1,
      resourceVersion: meta.resourceVersion ?? '100',
    },
    spec: {
      slug: 'compute',
      displayName: 'Compute',
      deprecated: false,
      suspend: false,
      assets: { baseURL: 'http://plugin.example.com' },
      visibility: { entitlement: 'Required' },
      ...spec,
    },
  };
}

/**
 * A fake API server for one CRD collection. List responses are served from
 * `lists` in order (the last one repeats); each watch request opens a stream
 * that `send`/`sendRaw` write to and `endWatch` closes.
 */
function fakeCluster(lists: unknown[][] = [[]]) {
  const encoder = new TextEncoder();
  const remainingLists = [...lists];
  const watchUrls: string[] = [];
  const patches: { path: string; body: any }[] = [];
  let listCount = 0;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  const fetchImpl = vi.fn(async (url: string, init: RequestInit = {}) => {
    const { pathname, searchParams } = new URL(url);
    if (init.method === 'PATCH') {
      patches.push({ path: pathname, body: JSON.parse(String(init.body)) });
      return new Response('{}', { status: 200 });
    }
    if (searchParams.get('watch') === 'true') {
      watchUrls.push(url);
      const body = new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
        },
      });
      return new Response(body, { status: 200 });
    }
    listCount += 1;
    const items = remainingLists.length > 1 ? remainingLists.shift() : remainingLists[0];
    return new Response(
      JSON.stringify({ items, metadata: { resourceVersion: LIST_RESOURCE_VERSION } }),
      { status: 200 }
    );
  });

  const client = new KubeClient(resolveKubeContext(parseKubeconfig(NO_AUTH_KUBECONFIG)), {
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

  const closeWatch = () => {
    const open = controller;
    controller = undefined;
    open?.close();
  };

  return {
    client,
    watchUrls,
    patches,
    listCount: () => listCount,
    sendRaw: (text: string) => controller?.enqueue(encoder.encode(text)),
    send: (event: unknown) => controller?.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
    endWatch: closeWatch,
    /** Resolves once the n-th watch stream is open and writable. */
    watchOpened: (n = 1) =>
      vi.waitFor(() => {
        expect(watchUrls).toHaveLength(n);
        expect(controller).toBeDefined();
      }),
  };
}

function makeRegistry() {
  const fetchImpl = vi.fn(
    async () => new Response(JSON.stringify(VALID_MANIFEST), { status: 200 })
  );
  return new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
}

const silentLogger = { warn: vi.fn(() => {}), info: vi.fn(() => {}), error: vi.fn(() => {}) };

describe.each(SOURCES)(
  '$label list/watch/reconcile',
  ({ registrySource, resourcePath, create }) => {
    let running: { source: CrdPluginSource; cluster: ReturnType<typeof fakeCluster> } | undefined;

    /** Starts a source against a fake cluster and waits for its watch to open. */
    async function startSource(lists?: unknown[][]) {
      const registry = makeRegistry();
      const cluster = fakeCluster(lists);
      const source = create(registry, cluster.client, {
        logger: silentLogger,
        delay: () => Promise.resolve(),
      });
      running = { source, cluster };
      source.start();
      await cluster.watchOpened();
      return { registry, cluster };
    }

    afterEach(() => {
      // Stop first so the closed stream ends the loop instead of re-listing.
      running?.source.stop();
      running?.cluster.endWatch();
      running = undefined;
    });

    test('lists the collection, then watches it from the listed resourceVersion', async () => {
      const { registry, cluster } = await startSource([[pluginResource()]]);

      expect(registry.getPlugin('compute')?.source).toBe(registrySource);
      const watchUrl = new URL(cluster.watchUrls[0]);
      expect(watchUrl.pathname).toBe(resourcePath);
      expect(watchUrl.searchParams.get('resourceVersion')).toBe(LIST_RESOURCE_VERSION);
    });

    test('an ADDED event reconciles the plugin into the registry and patches its status', async () => {
      const { registry, cluster } = await startSource();
      expect(registry.getPlugin('compute')).toBeUndefined();

      cluster.send({ type: 'ADDED', object: pluginResource() });

      await vi.waitFor(() => expect(cluster.patches).toHaveLength(1));
      const plugin = registry.getPlugin('compute');
      expect(plugin?.source).toBe(registrySource);
      expect(plugin?.manifest?.version).toBe('1.4.0');
      expect(cluster.patches[0].path).toBe(`${resourcePath}/${RESOURCE_NAME}/status`);
      expect(
        cluster.patches[0].body.status.conditions.some(
          (condition: any) => condition.type === 'Ready' && condition.status === 'True'
        )
      ).toBe(true);
    });

    test('a MODIFIED event with a new spec re-reconciles; a status-only one does not', async () => {
      const { registry, cluster } = await startSource();

      cluster.send({ type: 'ADDED', object: pluginResource() });
      await vi.waitFor(() => expect(cluster.patches).toHaveLength(1));
      expect(registry.getPlugin('compute')?.spec.visibility.entitlement).toBe('Required');

      // Our own status patch echoes back as a MODIFIED with an unchanged spec.
      cluster.send({ type: 'MODIFIED', object: pluginResource({}, { resourceVersion: '200' }) });
      cluster.send({
        type: 'MODIFIED',
        object: pluginResource({ visibility: { entitlement: 'None' } }, { resourceVersion: '300' }),
      });

      await vi.waitFor(() =>
        expect(registry.getPlugin('compute')?.spec.visibility.entitlement).toBe('None')
      );

      // Events apply in order, so once this DELETED lands every earlier
      // event's status patch has been sent: one for ADDED, one for the spec
      // change, and none for the echo.
      cluster.send({
        type: 'DELETED',
        object: { metadata: { name: RESOURCE_NAME, resourceVersion: '400' } },
      });
      await vi.waitFor(() => expect(registry.getPlugin('compute')).toBeUndefined());
      expect(cluster.patches).toHaveLength(2);
    });

    test('a DELETED event removes the plugin from the registry', async () => {
      const { registry, cluster } = await startSource([[pluginResource()]]);
      expect(registry.getPlugin('compute')).toBeDefined();

      // A DELETED object may arrive without its spec; the name still resolves it.
      cluster.send({
        type: 'DELETED',
        object: { metadata: { name: RESOURCE_NAME, resourceVersion: '400' } },
      });

      await vi.waitFor(() => expect(registry.getPlugin('compute')).toBeUndefined());
    });

    test('reassembles an event split across stream chunks', async () => {
      const { registry, cluster } = await startSource();
      const line = `${JSON.stringify({ type: 'ADDED', object: pluginResource() })}\n`;
      const splitAt = Math.floor(line.length / 2);

      cluster.sendRaw(line.slice(0, splitAt));
      cluster.sendRaw(line.slice(splitAt));

      await vi.waitFor(() => expect(registry.getPlugin('compute')).toBeDefined());
    });

    test('re-lists when the watch stream ends and prunes plugins that disappeared', async () => {
      const { registry, cluster } = await startSource([[pluginResource()], []]);
      expect(registry.getPlugin('compute')).toBeDefined();

      cluster.endWatch();

      await cluster.watchOpened(2);
      expect(cluster.listCount()).toBe(2);
      expect(registry.getPlugin('compute')).toBeUndefined();
    });
  }
);
