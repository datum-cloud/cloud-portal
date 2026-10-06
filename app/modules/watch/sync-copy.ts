// app/modules/watch/sync-copy.ts

export const SYNC_COPY = {
  deleting: 'Deleting…',
  reconnecting: 'Reconnecting… changes may be delayed',
  degraded: 'Live updates paused, retrying',
  recovered: 'Back in sync',
} as const;
