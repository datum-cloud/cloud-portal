import { syncState } from '@/modules/watch/sync-state';
import { useCallback, useRef, useSyncExternalStore } from 'react';

const KEY_SEPARATOR = '\n';
const noopUnsubscribe = () => {};
const getServerSnapshot = () => 0;

interface TableRowSync {
  version: number;
  /** Flips per flash so a re-changed row swaps keyframes and restarts the animation. */
  isAlternateFlash: (key: string) => boolean;
}

const statesOf = (joined: string) =>
  joined
    ? joined
        .split(KEY_SEPARATOR)
        .map((key) => syncState.get(key) ?? '')
        .join(KEY_SEPARATOR)
    : '';

/**
 * The sync states of a table's rows, as a version number, so a batch touching
 * many rows costs one render instead of rebuilding every row's state.
 */
export function useTableRowSync(keys: readonly string[]): TableRowSync {
  const joined = keys.join(KEY_SEPARATOR);
  const version = useRef(0);
  const flashes = useRef(new Map<string, number>()).current;
  // Catches a change between render and subscribe.
  const rendered = useRef('');
  rendered.current = statesOf(joined);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!joined) return noopUnsubscribe;
      const unsubscribes = joined.split(KEY_SEPARATOR).map((key) =>
        syncState.subscribe(key, () => {
          if (syncState.get(key) === 'changed') flashes.set(key, (flashes.get(key) ?? 0) + 1);
          version.current += 1;
          onChange();
        })
      );
      if (statesOf(joined) !== rendered.current) version.current += 1;
      return () => {
        for (const unsubscribe of unsubscribes) unsubscribe();
      };
    },
    [joined, flashes]
  );

  const current = useSyncExternalStore(subscribe, () => version.current, getServerSnapshot);
  const isAlternateFlash = useCallback(
    (key: string) => (flashes.get(key) ?? 0) % 2 === 1,
    [flashes]
  );
  return { version: current, isAlternateFlash };
}
