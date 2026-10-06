// app/modules/watch/use-watch-connection.ts
import { useWatchManager } from './watch.context';
import type { WatchConnectionState } from './watch.manager';
import { useSyncExternalStore } from 'react';

/** The server never holds a stream, so it renders as live and shows no indicator. */
const getServerSnapshot = (): WatchConnectionState => 'live';

export function useWatchConnection(): WatchConnectionState {
  const manager = useWatchManager();
  return useSyncExternalStore(
    manager.subscribeStatus,
    manager.getConnectionState,
    getServerSnapshot
  );
}
