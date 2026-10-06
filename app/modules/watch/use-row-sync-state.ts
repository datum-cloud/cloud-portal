// app/modules/watch/use-row-sync-state.ts
import { syncState, type RowSyncState } from './sync-state';
import { useCallback, useSyncExternalStore } from 'react';

const noopUnsubscribe = () => {};
const getServerSnapshot = (): RowSyncState | undefined => undefined;

export function useRowSyncState(key: string | undefined): RowSyncState | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => (key ? syncState.subscribe(key, onChange) : noopUnsubscribe),
    [key]
  );
  const getSnapshot = useCallback(() => (key ? syncState.get(key) : undefined), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const KEY_SEPARATOR = '\n';
const getServerStates = () => '';

/** One string that changes when any of `keys` does, so a table re-runs `rowClassName`. */
export function useRowSyncStates(keys: readonly string[]): string {
  const joined = keys.join(KEY_SEPARATOR);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!joined) return noopUnsubscribe;
      const unsubscribes = joined
        .split(KEY_SEPARATOR)
        .map((key) => syncState.subscribe(key, onChange));
      return () => {
        for (const unsubscribe of unsubscribes) unsubscribe();
      };
    },
    [joined]
  );
  const getSnapshot = useCallback(
    () =>
      joined
        ? joined
            .split(KEY_SEPARATOR)
            .map((key) => syncState.get(key) ?? '')
            .join(KEY_SEPARATOR)
        : '',
    [joined]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerStates);
}
