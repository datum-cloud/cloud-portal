// app/modules/watch/watch.channel-key.ts
//
// Single source of truth for watch channel keys.
//
// The browser (`WatchManager`) and the server (`WatchHub`) both derive the
// channel name for a subscription. Every subscribe, every unsubscribe and
// every fan-out event is routed by that string, so if the two derivations
// ever disagree the browser silently stops receiving the events it asked
// for. That invariant used to rest on a comment above each of two copies of
// the same array literal; both now call this function instead.

/**
 * The parts of a watch request that identify its channel.
 *
 * Structurally satisfied by both the client's `WatchOptions` and the
 * server's `WatchSubscribeRequest`, which is what keeps the two callers
 * honest without either having to import the other's types.
 */
export interface WatchChannelKeyParts {
  resourceType: string;
  orgId?: string;
  projectId?: string;
  namespace?: string;
  name?: string;
  labelSelector?: string;
  fieldSelector?: string;
  userScoped?: boolean;
}

/**
 * Build the deterministic channel name for a watch subscription.
 *
 * `userId` is required for user-scoped watches and ignored otherwise. It is
 * not decoration: the upstream K8s connection behind a user-scoped channel is
 * opened against one specific user's control plane
 * (`/users/{userId}/control-plane/...`), so a channel name shared by two
 * users would mean both of them reading the first subscriber's resources.
 * Every other scope already carries its boundary in an earlier segment
 * (`orgId` / `projectId` / `namespace`).
 *
 * @throws if a user-scoped key is requested without a user id — a key that
 *         cannot name its user must never be built, because it would collide
 *         with every other user's key for the same resource type.
 */
export function buildWatchChannelKey(parts: WatchChannelKeyParts, userId?: string): string {
  if (parts.userScoped && !userId) {
    throw new Error('[watch] userId is required to build a user-scoped channel key');
  }

  // Joined with ':' — unambiguous only because the server's zod schema
  // (`watchSubscribeSchema` in `app/server/watch/watch-hub.types.ts`) admits
  // no ':' in any of these fields. Widening those patterns to allow one would
  // let two different subscriptions collapse onto the same key.
  return [
    parts.resourceType,
    parts.orgId ?? '',
    parts.projectId ?? '',
    parts.namespace ?? '',
    parts.name ?? '',
    parts.labelSelector ?? '',
    parts.fieldSelector ?? '',
    parts.userScoped ? `user/${userId}` : '',
  ].join(':');
}
