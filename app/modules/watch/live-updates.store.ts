// app/modules/watch/live-updates.store.ts
//
// Per-table live-updates pause and pending-update tally.
//
// A module-level external store read through useSyncExternalStore. It
// answers one question for the watch layer: should this update be applied
// now, or held?
//
// The tally counts suppressed events per query key. It deliberately does NOT
// buffer the events themselves — resuming invalidates the query and lets the
// refetch be the source of truth, which avoids replaying transforms and
// preserving ordering across a pause of arbitrary length.
//
// Pausing is per query key, and its reach is scoped the same way: a query
// key is only gated while some mounted UI has registered a control for it
// (`registerControl`, called by `useLiveUpdates`). Everything else — the
// notification badge, quota bridges, and every list watch that has not
// adopted the toggle — keeps updating live. Without that rule a reader who
// paused one table would silently freeze some OTHER surface sharing that
// same query key, with no banner and no toggle anywhere to explain or undo
// it.
import { hashKey } from '@tanstack/react-query';

export const LIVE_UPDATES_STORAGE_KEY = 'datum-cloud-liveUpdates-paused';

// Not exported: nothing outside this module names this — see the module
// barrel (index.ts), which re-exports this file with `export *`.
//
// A hard ceiling on the persisted set, not the in-memory one. Each paused
// hash is a table the reader has not yet resumed; across many projects and
// zones over a long-lived session that set would otherwise grow without
// bound in localStorage. Eviction prefers an unmounted key over a mounted
// one — see `chooseEvictionVictim` — and is oldest-first within whichever
// group it picks from.
const MAX_PAUSED_KEYS = 50;

interface LiveUpdatesSnapshot {
  readonly paused: ReadonlySet<string>;
  readonly pending: ReadonlyMap<string, number>;
}

const SERVER_SNAPSHOT: LiveUpdatesSnapshot = {
  paused: new Set(),
  pending: new Map(),
};

/**
 * Read the persisted paused set, defensively.
 *
 * `Array.isArray` guards against more than a malformed value: it is also
 * what keeps a stale pre-rename value from a bare `'paused'` string (the old
 * `datum:liveUpdates` shape) from ever being misread as this one, even in
 * the unlikely event something later writes that shape under this key —
 * `JSON.parse('"paused"')` is a string, not an array, and is discarded here.
 *
 * `slice(-MAX_PAUSED_KEYS)` re-applies the cap on read, keeping the most
 * recently written entries — belt-and-braces alongside the cap `pause()`
 * enforces on write, in case the stored value was ever produced by a
 * version of this module without it.
 */
function readStoredPaused(): ReadonlySet<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(LIVE_UPDATES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const hashes = parsed.filter((entry): entry is string => typeof entry === 'string');
    return new Set(hashes.slice(-MAX_PAUSED_KEYS));
  } catch {
    // Unavailable, blocked, or a throwing accessor (sandboxed iframe,
    // partitioned storage). A pause set we cannot read is not an error —
    // default to nothing paused.
    return new Set();
  }
}

function persistPaused(paused: ReadonlySet<string>): void {
  try {
    localStorage.setItem(LIVE_UPDATES_STORAGE_KEY, JSON.stringify([...paused]));
  } catch {
    // Persistence is a convenience; an unwritable store must not break the
    // in-memory pause state for this session.
  }
}

/**
 * Which paused key `addPaused` should evict, given `paused` already
 * contains `justAdded` and is one over the cap.
 *
 * Prefers the oldest key with no mounted control. An unmounted pause is
 * exactly the kind the cap exists to bound — a table the reader paused and
 * then navigated away from, forgotten. A MOUNTED paused key is on screen
 * right now: silently evicting it would flip its toggle back to "Pause"
 * and drop its banner (`selectLiveUpdatesSlice`'s `isPaused` reads the
 * `paused` set directly) with no refetch to back that up — the reader
 * would see a table that looks live but isn't. That is the same class of
 * bug the `controls.has` half of `isHeldForHash` exists to prevent, just
 * arriving through the cap instead of the gate.
 *
 * `justAdded` is excluded from consideration — the key the caller just
 * explicitly paused must never be the one immediately evicted, however
 * unmounted it happens to be (e.g. a test pausing a key without first
 * registering a control for it).
 *
 * Falls back to the oldest entry overall — mounted or not — only when
 * every OTHER paused key is mounted too. That means 50+ tables paused AND
 * on screen simultaneously, which this app cannot produce today (one DNS
 * Records table per zone route, so it would take 50 simultaneous zone
 * tabs). Accepting that rare eviction is preferable to letting the set
 * grow past its cap: the cap is a real invariant other code (and tests)
 * rely on, and this fallback only matters in a scenario that does not
 * happen in practice.
 */
function chooseEvictionVictim(
  paused: ReadonlySet<string>,
  justAdded: string,
  isMounted: (hash: string) => boolean
): string | undefined {
  let fallback: string | undefined;
  for (const candidate of paused) {
    if (candidate === justAdded) continue;
    if (fallback === undefined) fallback = candidate;
    if (!isMounted(candidate)) return candidate;
  }
  return fallback;
}

interface AddPausedResult {
  readonly paused: ReadonlySet<string>;
  /** The hash evicted to stay at the cap, if any — see {@link chooseEvictionVictim}. */
  readonly evicted?: string;
}

/**
 * `paused` with `hash` added, capped at {@link MAX_PAUSED_KEYS} by evicting
 * the key {@link chooseEvictionVictim} picks. Insertion order — a `Set`
 * never reorders an entry that was already present — is what "oldest"
 * means within whichever group (unmounted, or the all-mounted fallback)
 * that eviction draws from; a key that keeps getting paused and resumed is
 * not "oldest" by virtue of that, only a key untouched since its first
 * pause is.
 *
 * Always returns a new Set — see the copy-on-write convention used
 * throughout this store.
 */
function addPaused(
  paused: ReadonlySet<string>,
  hash: string,
  isMounted: (hash: string) => boolean
): AddPausedResult {
  if (paused.has(hash)) return { paused };
  const next = new Set(paused);
  next.add(hash);
  if (next.size <= MAX_PAUSED_KEYS) return { paused: next };
  const evicted = chooseEvictionVictim(next, hash, isMounted);
  if (evicted === undefined) return { paused: next };
  next.delete(evicted);
  return { paused: next, evicted };
}

/**
 * The pending tally for a query key, read from a given snapshot.
 *
 * Exported so `useSyncExternalStore` consumers derive `pending` from the
 * snapshot React actually rendered instead of re-reading the module
 * singleton mid-render. The store's own `pendingFor` delegates here so the
 * two can never disagree about how a key is hashed.
 *
 * `hash` is optional: a caller that has already hashed `queryKey` for its
 * own purposes (registration, a selector) can pass it straight through
 * instead of paying for a second `JSON.stringify` of the same key.
 */
export function selectPending(
  snapshot: LiveUpdatesSnapshot,
  queryKey: readonly unknown[],
  hash: string = hashKey(queryKey)
): number {
  return snapshot.pending.get(hash) ?? 0;
}

/**
 * How many query keys are currently paused, across every project and zone —
 * not just the one(s) with mounted UI. This is what the footer's
 * resume-all control counts: a reader can pause a table, navigate away
 * (unmounting its control), and still be responsible for resuming it later.
 */
export function selectPausedCount(snapshot: LiveUpdatesSnapshot): number {
  return snapshot.paused.size;
}

export interface LiveUpdatesSlice {
  readonly isPaused: boolean;
  readonly pending: number;
}

/**
 * The slice of the snapshot one query key's consumer actually cares about:
 * whether THIS key is paused, and how many updates are held for it.
 *
 * `isPaused` reads the paused set directly, not through the `controls.has`
 * gate `isHeldForHash` applies — see that function's comment. A toggle
 * mounting for the first time must show its own key's persisted pause state
 * immediately, before its own registration effect has had a chance to run.
 *
 * Paired with {@link liveUpdatesSliceEquality} so a
 * `useSyncExternalStoreWithSelector` consumer re-renders only when its own
 * slice changes — not on every tally bump or pause elsewhere for every other
 * registered key.
 */
export function selectLiveUpdatesSlice(
  snapshot: LiveUpdatesSnapshot,
  queryKey: readonly unknown[],
  hash: string = hashKey(queryKey)
): LiveUpdatesSlice {
  return {
    isPaused: snapshot.paused.has(hash),
    pending: selectPending(snapshot, queryKey, hash),
  };
}

/**
 * Value equality for {@link LiveUpdatesSlice}. `selectLiveUpdatesSlice`
 * allocates a new object on every call, so a reference check here would
 * defeat the selector and re-render every consumer on every snapshot change
 * again — the exact problem the selector exists to avoid.
 */
export function liveUpdatesSliceEquality(a: LiveUpdatesSlice, b: LiveUpdatesSlice): boolean {
  return a.isPaused === b.isPaused && a.pending === b.pending;
}

function createLiveUpdatesStore() {
  const listeners = new Set<() => void>();
  // hash(queryKey) -> one token per mounted control for that key. Counted,
  // because both LiveUpdatesToggle and LiveUpdatesBanner call useLiveUpdates
  // for the same key: a single flag would un-gate the key when one of them
  // unmounted while the other was still on screen.
  //
  // Tokens rather than an integer so unregistering is idempotent and safe
  // by construction — see registerControl.
  //
  // Deliberately outside the snapshot: registration is not render state, and
  // notifying on it would churn every subscriber on mount and unmount.
  const controls = new Map<string, ReadonlySet<symbol>>();
  // hash(queryKey) -> the actual queryKey array for that hash, kept for as
  // long as ANY control for it is mounted. A hash alone cannot be handed
  // back to `queryClient.invalidateQueries`, which needs the real key — this
  // is what lets `resumeAll()` tell its caller which currently-mounted
  // tables to catch up, without the store itself depending on react-query's
  // QueryClient.
  const controlKeys = new Map<string, readonly unknown[]>();
  let snapshot: LiveUpdatesSnapshot = {
    paused: readStoredPaused(),
    pending: new Map(),
  };

  function notify() {
    for (const listener of listeners) listener();
  }

  function setSnapshot(next: LiveUpdatesSnapshot) {
    snapshot = next;
    notify();
  }

  /**
   * The one definition of "this key is currently held": paused AND some
   * mounted UI can show and undo it. Both `gate` and `isHeld` route through
   * this, so the gated path and the replay path cannot drift apart on what
   * pausing means.
   *
   * The `controls.has` half is nearly redundant now that pausing is
   * per-key — a control is what offers the pause in the first place — but
   * it is kept deliberately: it is the only thing standing between "paused"
   * and "held" if a key is ever paused (e.g. programmatically, or from a
   * stale persisted set) with no control mounted for it. Dropping it would
   * let an update be held for a surface that cannot show or undo the hold.
   */
  function isHeldForHash(hash: string): boolean {
    return snapshot.paused.has(hash) && controls.has(hash);
  }

  return {
    getSnapshot: (): LiveUpdatesSnapshot => snapshot,
    getServerSnapshot: (): LiveUpdatesSnapshot => SERVER_SNAPSHOT,

    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Is this one query key currently paused? Mirrors `selectLiveUpdatesSlice`'s
     * `isPaused` — no `controls.has` gate, see that function's comment.
     * No production caller yet — exercised by tests only.
     */
    isPaused: (queryKey: readonly unknown[]): boolean => snapshot.paused.has(hashKey(queryKey)),

    /**
     * Declare that some mounted UI can show and undo the pause for this
     * query key. Only registered keys are gated — see the module comment.
     *
     * @returns An unregister function for effect cleanup.
     */
    registerControl: (queryKey: readonly unknown[]): (() => void) => {
      const hash = hashKey(queryKey);
      const token = Symbol('live-updates-control');
      const mounted = controls.get(hash);
      controls.set(hash, mounted ? new Set(mounted).add(token) : new Set([token]));
      if (!controlKeys.has(hash)) controlKeys.set(hash, queryKey);

      return () => {
        const current = controls.get(hash);
        // Identity, not arithmetic. A second call, or one arriving after
        // __resetForTests() cleared the registry — which the cypress
        // beforeEach can race against a previous test's unmount — finds no
        // matching token and does nothing. A counter would decrement past
        // zero here and take a live mount's registration, and its tally,
        // down with it.
        if (!current?.has(token)) return;

        const remaining = new Set(current);
        remaining.delete(token);
        if (remaining.size > 0) {
          controls.set(hash, remaining);
          return;
        }
        controls.delete(hash);
        controlKeys.delete(hash);

        // Nothing is left to consume this count: the banner that displays it
        // has unmounted, and the key is no longer gated, so from here it can
        // only go stale and resurface on the next mount, ahead of the
        // refetch that mount triggers.
        if (snapshot.pending.has(hash)) {
          const pending = new Map(snapshot.pending);
          pending.delete(hash);
          setSnapshot({ ...snapshot, pending });
        }
      };
    },

    /**
     * Does any mounted UI offer a pause/resume control for this key?
     * No production caller yet — exercised by tests only.
     */
    hasControl: (queryKey: readonly unknown[]): boolean => controls.has(hashKey(queryKey)),

    /**
     * Would an update for this key be held right now?
     *
     * Side-effect free — unlike {@link gate} it records nothing, so callers
     * that drop an event without counting it (the replay branch in
     * use-resource-watch) can ask without inflating the tally.
     */
    isHeld: (queryKey: readonly unknown[]): boolean => isHeldForHash(hashKey(queryKey)),

    /**
     * Pause updates for this one query key. Other keys are unaffected,
     * except — only once every 50 keys are already paused — the one entry
     * {@link chooseEvictionVictim} evicts to hold the cap. Its pending
     * tally, if it had one, is cleared along with it: an orphaned tally for
     * a key no longer paused serves nothing.
     */
    pause: (queryKey: readonly unknown[]): void => {
      const hash = hashKey(queryKey);
      if (snapshot.paused.has(hash)) return;
      const { paused, evicted } = addPaused(snapshot.paused, hash, (h) => controls.has(h));
      persistPaused(paused);

      if (evicted !== undefined && snapshot.pending.has(evicted)) {
        const pending = new Map(snapshot.pending);
        pending.delete(evicted);
        setSnapshot({ paused, pending });
        return;
      }
      setSnapshot({ ...snapshot, paused });
    },

    /**
     * Resume updates for this one query key. Other keys — including other
     * paused tables — are unaffected: their pause and their pending tally
     * are left exactly as they were.
     *
     * Clears this key's own pending tally — a count of suppressed events has
     * no meaning once updates flow again for it — and nothing else's.
     */
    resume: (queryKey: readonly unknown[]): void => {
      const hash = hashKey(queryKey);
      if (!snapshot.paused.has(hash)) return;
      const paused = new Set(snapshot.paused);
      paused.delete(hash);
      persistPaused(paused);

      if (!snapshot.pending.has(hash)) {
        setSnapshot({ ...snapshot, paused });
        return;
      }
      const pending = new Map(snapshot.pending);
      pending.delete(hash);
      setSnapshot({ paused, pending });
    },

    /**
     * Should the caller apply this update now?
     *
     * Returns true while nothing is paused, and true for any query key with
     * no registered control. Otherwise records the suppressed event against
     * the query key and returns false.
     */
    gate: (queryKey: readonly unknown[]): boolean => {
      // The overwhelmingly common case — nothing paused at all — is checked
      // before hashing, so a live watch event never pays for a
      // `JSON.stringify` of queryKey just to learn that no key is held.
      if (snapshot.paused.size === 0) return true;
      const hash = hashKey(queryKey);
      // Not held for this key — either it isn't paused, or it is but no
      // control can show or undo the hold, so holding it would be
      // invisible.
      if (!isHeldForHash(hash)) return true;
      const pending = new Map(snapshot.pending);
      pending.set(hash, (pending.get(hash) ?? 0) + 1);
      setSnapshot({ ...snapshot, pending });
      return false;
    },

    /** No production caller yet — exercised by tests only. */
    pendingFor: (queryKey: readonly unknown[]): number => selectPending(snapshot, queryKey),

    /** How many query keys are currently paused. See {@link selectPausedCount}. */
    pausedCount: (): number => selectPausedCount(snapshot),

    clearPending: (queryKey: readonly unknown[]) => {
      const hash = hashKey(queryKey);
      if (!snapshot.pending.has(hash)) return;
      const pending = new Map(snapshot.pending);
      pending.delete(hash);
      setSnapshot({ ...snapshot, pending });
    },

    /**
     * Resume every paused table at once: clears the persisted paused set
     * and the entire pending tally, and notifies subscribers.
     *
     * Returns the query keys that were BOTH paused and currently mounted —
     * the tables a caller with a QueryClient should invalidate to actually
     * catch them up, the same as one table's own `resume` does for itself.
     * A paused key with nothing mounted has no on-screen data to catch up;
     * it will simply no longer be gated the next time it is.
     *
     * The store has no QueryClient of its own, so unlike a single table's
     * `resume` this does not invalidate anything itself — the caller (the
     * footer's resume-all control) does that with the keys returned here.
     */
    resumeAll: (): readonly (readonly unknown[])[] => {
      const mountedPausedKeys: (readonly unknown[])[] = [];
      for (const hash of snapshot.paused) {
        const key = controlKeys.get(hash);
        if (key) mountedPausedKeys.push(key);
      }

      persistPaused(new Set());
      setSnapshot({ paused: new Set(), pending: new Map() });

      return mountedPausedKeys;
    },

    /**
     * Test seam — restores a fresh store without reloading the module.
     *
     * Underscore-prefixed so application code cannot reach it by
     * autocomplete: resetting global pause state at runtime would silently
     * discard a reader's choices.
     */
    __resetForTests: () => {
      controls.clear();
      controlKeys.clear();
      snapshot = { paused: readStoredPaused(), pending: new Map() };
      notify();
    },
  };
}

type LiveUpdatesStore = ReturnType<typeof createLiveUpdatesStore>;

/**
 * Get or create the singleton store instance.
 * Persists across HMR reloads by storing on `window.__liveUpdatesStore`,
 * the same pattern watch.manager.ts's getWatchManager() uses. Without this,
 * an HMR update that re-evaluates this module would produce a fresh store —
 * emptying `controls` while toggles and banners already on screen stay
 * mounted, and resetting the tally out from under them.
 * Returns a fresh instance on the server (SSR), matching watchManager's
 * SSR fallback: nothing on the server persists across requests to reuse.
 */
function getLiveUpdatesStore(): LiveUpdatesStore {
  if (typeof window === 'undefined') {
    return createLiveUpdatesStore();
  }

  // HMR persistence
  const win = window as unknown as { __liveUpdatesStore?: LiveUpdatesStore };
  if (import.meta.hot) {
    if (!win.__liveUpdatesStore) {
      win.__liveUpdatesStore = createLiveUpdatesStore();
    }
    return win.__liveUpdatesStore;
  }

  if (!win.__liveUpdatesStore) {
    win.__liveUpdatesStore = createLiveUpdatesStore();
  }
  return win.__liveUpdatesStore;
}

export const liveUpdatesStore = getLiveUpdatesStore();
