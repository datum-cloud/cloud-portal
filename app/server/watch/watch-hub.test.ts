import {
  HEARTBEAT_INTERVAL_MS,
  SSE_IDLE_TIMEOUT_MS,
  WatchHub,
  buildWatchUpstreamPath,
  type WatchHub as WatchHubType,
} from './watch-hub';
import type { WatchClient, WatchSubscribeRequest } from './watch-hub.types';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';

/**
 * Minimal stand-in for Hono's SSE stream. Records every write so a test can
 * assert the hub actually put bytes on the wire, which is the only thing that
 * keeps a streamed response from being closed as idle.
 */
function createFakeStream() {
  const writes: Array<{ event?: string; data?: string }> = [];
  return {
    writes,
    stream: {
      writeSSE: (msg: { event?: string; data?: string }) => {
        writes.push(msg);
        return Promise.resolve();
      },
    },
  };
}

function registerFakeClient(hub: WatchHubType, id: string) {
  const { writes, stream } = createFakeStream();
  const accepted = hub.registerClient({
    id,
    userId: 'user-1',
    stream,
    subscriptions: new Set(),
    token: 'token-1',
    lastActivity: Date.now(),
  } as unknown as WatchClient);
  return { writes, accepted };
}

describe('WatchHub heartbeat', () => {
  let hub: WatchHubType | null = null;

  afterEach(() => {
    hub?.shutdown();
    hub = null;
  });

  it('beats faster than the runtime closes an idle stream', () => {
    // Regression guard for the e2e failure where `POST /api/watch/subscribe`
    // returned 403. A heartbeat slower than the idle close means the SSE
    // connection is dropped before the first beat, `onAbort` evicts the client,
    // and the next subscribe can't find it.
    //
    // Half the ceiling, not merely under it: an 8000ms beat is comfortably
    // below the 12s close and still dropped the connection at 24s in a live
    // run, so a margin this size is load-bearing rather than decorative.
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThanOrEqual(SSE_IDLE_TIMEOUT_MS / 2);
  });

  it('writes to a connected client before the idle timeout elapses', () => {
    const intervalSpy = spyOn(globalThis, 'setInterval');

    hub = new WatchHub();
    const { writes, accepted } = registerFakeClient(hub, 'client-1');

    expect(accepted).toBe(true);
    // registerClient sends `connected` immediately; ignore it and watch for
    // what arrives afterwards purely from the heartbeat.
    const afterConnect = writes.length;

    const heartbeatCall = intervalSpy.mock.calls.find(([, ms]) => ms === HEARTBEAT_INTERVAL_MS);
    expect(heartbeatCall).toBeDefined();
    expect(heartbeatCall![1]).toBeLessThan(SSE_IDLE_TIMEOUT_MS);

    const tickHeartbeat = heartbeatCall![0];
    expect(typeof tickHeartbeat).toBe('function');
    (tickHeartbeat as () => void)();

    const heartbeats = writes.slice(afterConnect).filter((w) => w.event === 'heartbeat');
    expect(heartbeats.length).toBeGreaterThan(0);

    intervalSpy.mockRestore();
  });
});

describe('buildWatchUpstreamPath', () => {
  const namespacedProxy: WatchSubscribeRequest = {
    clientId: '00000000-0000-0000-0000-000000000001',
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId: 'project-22w58',
    namespace: 'default',
  };

  it('keeps namespaced project resources under /namespaces/{ns}', () => {
    expect(buildWatchUpstreamPath(namespacedProxy)).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-22w58/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/default/httpproxies'
    );
  });

  it('omits /namespaces for cluster-scoped project resources', () => {
    expect(
      buildWatchUpstreamPath({
        clientId: '00000000-0000-0000-0000-000000000001',
        resourceType: 'apis/locations.miloapis.com/v1alpha1/locations',
        projectId: 'project-22w58',
      })
    ).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-22w58/control-plane/apis/locations.miloapis.com/v1alpha1/locations'
    );
  });

  it('keeps a non-default project namespace (allowance buckets)', () => {
    expect(
      buildWatchUpstreamPath({
        clientId: '00000000-0000-0000-0000-000000000001',
        resourceType: 'apis/quota.miloapis.com/v1alpha1/allowancebuckets',
        projectId: 'project-22w58',
        namespace: 'milo-system',
      })
    ).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-22w58/control-plane/apis/quota.miloapis.com/v1alpha1/namespaces/milo-system/allowancebuckets'
    );
  });

  it('omits /namespaces for cluster-scoped org resources', () => {
    expect(
      buildWatchUpstreamPath({
        clientId: '00000000-0000-0000-0000-000000000001',
        resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
        orgId: 'org-1',
      })
    ).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/organizations/org-1/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/projects'
    );
  });
});
