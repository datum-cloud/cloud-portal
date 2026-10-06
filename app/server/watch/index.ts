import { watchHub } from './watch-hub';
import { createPodId, createWatchRelay } from './watch-relay';
import { createRelayClient, createSubscriber, redisClient } from '@/modules/redis';
import { env } from '@/utils/env/env.server';

export { watchHub };
export type * from './watch-hub.types';

const relayEnabled = env.server.watchRelayEnabled && redisClient !== null;

/**
 * Pod ID is `HOSTNAME` plus a per-boot suffix, so a restarted pod never gets
 * messages meant for its previous boot. Started in `entry.ts`.
 */
export const watchRelay = createWatchRelay({
  redis: relayEnabled ? createRelayClient() : null,
  subscriber: relayEnabled ? createSubscriber() : null,
  podId: createPodId(process.env.HOSTNAME),
  hub: watchHub,
  enabled: relayEnabled,
});
