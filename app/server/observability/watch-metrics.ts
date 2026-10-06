import type { UpstreamState, WatchResyncReason } from '@/server/watch/watch-hub.types';
import { Counter, register } from 'prom-client';

/** Reuses a registered metric so HMR/test re-imports don't throw (#1614). */
function counter<L extends string>(name: string, help: string, labelNames: readonly L[]) {
  return (
    (register.getSingleMetric(name) as Counter<L> | undefined) ??
    new Counter<L>({ name, help, labelNames: [...labelNames] })
  );
}

/** `not_owner`: this pod has no such client, usually because its stream landed elsewhere. */
export type WatchSubscribeOutcome = 'local' | 'relayed' | 'forbidden' | 'not_owner' | 'invalid';

export const WATCH_SUBSCRIBE_OUTCOMES = [
  'local',
  'relayed',
  'forbidden',
  'not_owner',
  'invalid',
] as const satisfies readonly WatchSubscribeOutcome[];

export const WATCH_RESYNC_REASONS = [
  'joined',
  'expired',
  'degraded',
  'recovered',
  'auth',
] as const satisfies readonly WatchResyncReason[];

export const watchSubscribeTotal = counter(
  'watch_subscribe_total',
  'Count of watch subscribe requests, by outcome',
  ['outcome'] as const
);

export const watchResyncTotal = counter(
  'watch_resync_total',
  'Count of resync events the watch hub emitted for a channel, by reason',
  ['reason'] as const
);

export const watchUpstreamStateTotal = counter(
  'watch_upstream_state_total',
  'Count of watch upstream state transitions, by the state entered',
  ['state'] as const
);

export function countWatchSubscribe(outcome: WatchSubscribeOutcome): void {
  watchSubscribeTotal.inc({ outcome });
}

export function countWatchResync(reason: WatchResyncReason): void {
  watchResyncTotal.inc({ reason });
}

export function countWatchUpstreamState(state: UpstreamState): void {
  watchUpstreamStateTotal.inc({ state });
}
