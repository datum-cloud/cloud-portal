// Per-row UI state for live lists, kept outside the query cache so cached
// objects never carry UI fields back to the API.

export type RowSyncState =
  'pending-create' | 'pending-update' | 'pending-delete' | 'changed' | 'removing';

export const CHANGED_FLASH_MS = 1500;
export const REMOVING_FADE_MS = 300;
/** Watch events this soon after a row's own mutation are not flashed. */
export const RECENT_MUTATION_MS = 2000;

const PENDING_STATES: ReadonlySet<RowSyncState> = new Set([
  'pending-create',
  'pending-update',
  'pending-delete',
]);

export const isPendingSyncState = (state: RowSyncState | undefined): boolean =>
  state !== undefined && PENDING_STATES.has(state);

export const PENDING_NAME_PREFIX = '__pending__/';

/** A create row with a temporary name has no server object to send a request for. */
export const isRowLocked = (key: string | undefined, state: RowSyncState | undefined): boolean =>
  isPendingSyncState(state) || (key !== undefined && key.includes(`/${PENDING_NAME_PREFIX}`));

export const ACCOUNT_SYNC_SCOPE = 'account';

/** Scoped by project or org id so the same name in two projects never shares a row state. */
export const syncKey = (kind: string, scope: string, name: string): string =>
  `${kind}/${scope}/${name}`;

export interface SyncStateStore {
  set(key: string, state: RowSyncState): void;
  clear(key: string): void;
  get(key: string): RowSyncState | undefined;
  /** A row already `changed` restarts its timer and notifies again to replay the flash. */
  flashChanged(key: string): void;
  markRemoving(key: string, onDone: () => void): void;
  /** Pending now, or a pending state was cleared within 2000ms. */
  recentlyMutated(key: string): boolean;
  pendingSince(key: string): number | undefined;
  subscribe(key: string, fn: () => void): () => void;
  /** For tests. */
  size(): number;
  /** For tests that share the app-wide store; does not notify or run removals. */
  reset(): void;
}

export function createSyncState(): SyncStateStore {
  const states = new Map<string, RowSyncState>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingEndedAt = new Map<string, number>();
  const pendingStartedAt = new Map<string, number>();
  const listeners = new Map<string, Set<() => void>>();

  const notify = (key: string) => {
    for (const fn of listeners.get(key) ?? []) fn();
  };

  // Whatever replaces a fade, the row still has to leave the list.
  const removals = new Map<string, () => void>();

  const cancelTimer = (key: string) => {
    const timer = timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(key);
    }
    const removal = removals.get(key);
    if (removal) {
      removals.delete(key);
      removal();
    }
  };

  const pruneEnded = (now: number) => {
    for (const [key, endedAt] of pendingEndedAt) {
      if (now - endedAt >= RECENT_MUTATION_MS) pendingEndedAt.delete(key);
    }
  };

  const write = (key: string, next: RowSyncState | undefined) => {
    const current = states.get(key);
    if (current === next) return;
    if (isPendingSyncState(current) && !isPendingSyncState(next)) {
      const now = Date.now();
      pruneEnded(now);
      pendingEndedAt.set(key, now);
      pendingStartedAt.delete(key);
    } else if (!isPendingSyncState(current) && isPendingSyncState(next)) {
      pendingStartedAt.set(key, Date.now());
    }
    if (next === undefined) {
      states.delete(key);
    } else {
      states.set(key, next);
    }
    notify(key);
  };

  const expireAfter = (key: string, ms: number, onExpire: () => void) => {
    cancelTimer(key);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        onExpire();
      }, ms)
    );
  };

  return {
    set(key, state) {
      cancelTimer(key);
      write(key, state);
    },

    clear(key) {
      cancelTimer(key);
      write(key, undefined);
    },

    get: (key) => states.get(key),

    flashChanged(key) {
      const current = states.get(key);
      if (isPendingSyncState(current) || current === 'removing') return;
      if (current === 'changed') {
        notify(key);
      } else {
        write(key, 'changed');
      }
      expireAfter(key, CHANGED_FLASH_MS, () => write(key, undefined));
    },

    markRemoving(key, onDone) {
      write(key, 'removing');
      expireAfter(key, REMOVING_FADE_MS, () => {
        removals.delete(key);
        write(key, undefined);
        onDone();
      });
      removals.set(key, onDone);
    },

    recentlyMutated(key) {
      if (isPendingSyncState(states.get(key))) return true;
      const endedAt = pendingEndedAt.get(key);
      return endedAt !== undefined && Date.now() - endedAt < RECENT_MUTATION_MS;
    },

    pendingSince: (key) => pendingStartedAt.get(key),

    subscribe(key, fn) {
      const set = listeners.get(key) ?? new Set();
      set.add(fn);
      listeners.set(key, set);
      return () => {
        set.delete(fn);
        if (set.size === 0) listeners.delete(key);
      };
    },

    size: () => new Set([...states.keys(), ...pendingEndedAt.keys()]).size,

    reset() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      removals.clear();
      states.clear();
      pendingEndedAt.clear();
      pendingStartedAt.clear();
    },
  };
}

export const syncState: SyncStateStore = createSyncState();
