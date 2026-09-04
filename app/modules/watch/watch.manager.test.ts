import { WatchManager } from './watch.manager';
import type { WatchEvent, WatchOptions } from './watch.types';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const USER_SCOPED: WatchOptions = {
  resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
  userScoped: true,
};

/** Reach past `private` to drive the SSE protocol handler the stream feeds. */
type Internals = {
  handleSSEMessage(raw: string): void;
};

function deliver(manager: WatchManager, event: string, data: unknown): void {
  (manager as unknown as Internals).handleSSEMessage(
    `event: ${event}\ndata: ${JSON.stringify(data)}`
  );
}

function connected(manager: WatchManager, data: Record<string, unknown>): void {
  deliver(manager, 'connected', { clientId: 'client-1', ...data });
}

describe('WatchManager deferred user-scoped subscriptions', () => {
  let posts: string[];
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    posts = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      posts.push(String(init?.body ?? input));
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('holds a user-scoped subscription until the handshake names the user', () => {
    // The channel key embeds the user id, so before the handshake there is no
    // name to listen on. Keying it any other way would mean subscribing to a
    // channel the hub never broadcasts.
    const manager = new WatchManager();

    manager.subscribe(USER_SCOPED, () => {});

    expect(manager.getStatus().channels).toEqual([]);
    expect(posts).toEqual([]);
  });

  it('delivers a held subscription once the handshake arrives', async () => {
    const manager = new WatchManager();
    const received: WatchEvent<unknown>[] = [];

    manager.subscribe(USER_SCOPED, (event) => received.push(event));
    connected(manager, { userId: 'user-a' });

    const channels = manager.getStatus().channels;
    expect(channels).toHaveLength(1);
    expect(channels[0]).toContain('user-a');

    // Subscribed on the server under that same name...
    expect(posts.some((body) => body.includes('userinvitations'))).toBe(true);

    // ...and events on it reach the subscriber.
    deliver(manager, 'watch', {
      channel: channels[0],
      type: 'ADDED',
      object: { metadata: { name: 'invite-1' } },
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('ADDED');
  });

  it('cancels a subscription unsubscribed while it was still held', () => {
    // The entry has no channel key yet, so dropping it is the whole
    // unsubscribe — and asking for a key it cannot have would throw.
    const manager = new WatchManager();

    const unsubscribe = manager.subscribe(USER_SCOPED, () => {});
    expect(() => unsubscribe()).not.toThrow();

    connected(manager, { userId: 'user-a' });

    expect(manager.getStatus().channels).toEqual([]);
    expect(posts).toEqual([]);
  });

  it('keeps a held subscription when the handshake omits the user', () => {
    // Draining without an id used to throw inside `buildChannelKey`, and the
    // throw was swallowed by the SSE parse guard — the queue was gone, the
    // pending subscriptions never flushed, and every watch in the tab dead
    // with one warning to show for it. The entry must survive to be delivered
    // by the next handshake that does name the user.
    const manager = new WatchManager();
    const received: WatchEvent<unknown>[] = [];

    manager.subscribe(USER_SCOPED, (event) => received.push(event));

    expect(() => connected(manager, {})).not.toThrow();
    expect(manager.getStatus().channels).toEqual([]);

    connected(manager, { userId: 'user-a' });

    const channels = manager.getStatus().channels;
    expect(channels).toHaveLength(1);
    expect(channels[0]).toContain('user-a');
  });

  it('does not hold back subscriptions that are not user-scoped', () => {
    // Their keys carry no user id, so there is nothing to wait for.
    const manager = new WatchManager();

    manager.subscribe(
      {
        resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
        projectId: 'project-1',
        namespace: 'default',
      },
      () => {}
    );

    expect(manager.getStatus().channels).toHaveLength(1);
  });
});
