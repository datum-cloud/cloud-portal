import { buildWatchChannelKey, type WatchChannelKeyParts } from './watch.channel-key';
import { WatchManager } from './watch.manager';
import type { WatchOptions } from './watch.types';
import { WatchHub } from '@/server/watch/watch-hub';
import type { WatchSubscribeRequest } from '@/server/watch/watch-hub.types';
import { describe, expect, it } from 'bun:test';

const USER_SCOPED: WatchChannelKeyParts = {
  resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
  userScoped: true,
};

describe('buildWatchChannelKey', () => {
  it('gives each user their own channel for the same user-scoped watch', () => {
    // The upstream behind a user-scoped channel is opened against one
    // specific user's control plane, so a channel two users share is a
    // channel one of them reads the other's resources on.
    expect(buildWatchChannelKey(USER_SCOPED, 'user-a')).not.toBe(
      buildWatchChannelKey(USER_SCOPED, 'user-b')
    );
  });

  it('names the user in the key so no two users can collide', () => {
    expect(buildWatchChannelKey(USER_SCOPED, 'user-a')).toContain('user-a');
  });

  it('gives one user the same channel every time', () => {
    expect(buildWatchChannelKey(USER_SCOPED, 'user-a')).toBe(
      buildWatchChannelKey(USER_SCOPED, 'user-a')
    );
  });

  it('refuses to build a user-scoped key without a user id', () => {
    // Failing here is the point: a user-scoped key that cannot name its user
    // is exactly the key that collides with every other user's.
    expect(() => buildWatchChannelKey(USER_SCOPED)).toThrow(/userId is required/);
  });

  it('ignores the user id for watches that are not user-scoped', () => {
    // Every other scope carries its boundary in an earlier segment, and two
    // users watching one project are meant to share the upstream.
    const projectScoped: WatchChannelKeyParts = {
      resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
      projectId: 'project-1',
      namespace: 'default',
    };

    expect(buildWatchChannelKey(projectScoped, 'user-a')).toBe(
      buildWatchChannelKey(projectScoped, 'user-b')
    );
  });

  it('separates watches that differ in any scoping field', () => {
    const base: WatchChannelKeyParts = {
      resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
      projectId: 'project-1',
      namespace: 'default',
    };
    const keys = new Set([
      buildWatchChannelKey(base),
      buildWatchChannelKey({ ...base, projectId: 'project-2' }),
      buildWatchChannelKey({ ...base, namespace: 'other' }),
      buildWatchChannelKey({ ...base, name: 'example-com' }),
      buildWatchChannelKey({ ...base, labelSelector: 'app=web' }),
      buildWatchChannelKey({ ...base, fieldSelector: 'status.phase=Running' }),
      buildWatchChannelKey({ ...base, orgId: 'org-1' }),
    ]);

    expect(keys.size).toBe(7);
  });
});

/**
 * The browser and the hub each derive the channel name for a subscription,
 * and every subscribe, unsubscribe and fan-out event routes by that string.
 * The two derivations agreeing is load-bearing, and it used to be held up by
 * a comment on each of two copies of the same array literal. These tests
 * exercise both real code paths so a copy reintroduced on either side fails
 * here rather than in production.
 *
 * Reaching through `private` is deliberate: the point is to compare what each
 * side actually computes, not a re-implementation of it.
 */
describe('client and server channel key agreement', () => {
  type KeyBuilder = { buildChannelKey(options: WatchOptions): string };
  type WatchKeyBuilder = { buildWatchKey(req: WatchSubscribeRequest, userId: string): string };

  const subscriptions: Array<{ label: string; options: WatchOptions }> = [
    {
      label: 'project-scoped list',
      options: {
        resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
        projectId: 'project-1',
        namespace: 'default',
      },
    },
    {
      label: 'org-scoped list',
      options: {
        resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
        orgId: 'org-1',
      },
    },
    {
      label: 'named single-resource watch',
      options: {
        resourceType: 'apis/networking.datumapis.com/v1alpha/dnszones',
        projectId: 'project-1',
        namespace: 'default',
        name: 'example-com',
      },
    },
    {
      label: 'selector watch',
      options: {
        resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
        projectId: 'project-1',
        labelSelector: 'app=web',
        fieldSelector: 'status.phase=Running',
      },
    },
    {
      label: 'user-scoped watch',
      options: {
        resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
        userScoped: true,
      },
    },
  ];

  for (const { label, options } of subscriptions) {
    it(`derives the same channel on both sides for a ${label}`, () => {
      const userId = 'user-a';

      const manager = new WatchManager();
      (manager as unknown as { userId: string | null }).userId = userId;
      const clientKey = (manager as unknown as KeyBuilder).buildChannelKey(options);

      const hub = new WatchHub();
      const serverKey = (hub as unknown as WatchKeyBuilder).buildWatchKey(
        { clientId: 'client-1', ...options },
        userId
      );
      hub.shutdown();

      expect(clientKey).toBe(serverKey);
    });
  }

  it('derives different channels for two users on the same user-scoped watch', () => {
    const options: WatchOptions = {
      resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
      userScoped: true,
    };

    const managerA = new WatchManager();
    (managerA as unknown as { userId: string | null }).userId = 'user-a';
    const managerB = new WatchManager();
    (managerB as unknown as { userId: string | null }).userId = 'user-b';

    expect((managerA as unknown as KeyBuilder).buildChannelKey(options)).not.toBe(
      (managerB as unknown as KeyBuilder).buildChannelKey(options)
    );
  });
});
