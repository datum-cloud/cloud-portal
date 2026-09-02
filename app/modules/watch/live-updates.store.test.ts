import {
  liveUpdatesStore,
  LIVE_UPDATES_STORAGE_KEY,
  liveUpdatesSliceEquality,
  selectLiveUpdatesSlice,
  selectPausedCount,
} from './live-updates.store';
import { hashKey } from '@tanstack/react-query';
import { describe, expect, it, beforeEach } from 'bun:test';

// app/modules/watch/live-updates.store.test.ts
//
// localStorage polyfill — bun:test runs in a Node-like environment where
// localStorage is not available (typeof localStorage === 'undefined') and
// there is no `Storage` global to patch.
//
// It does NOT run before the module under test: ESM hoists imports, so
// live-updates.store.ts is evaluated — and its top-level
// `readStoredPaused()` call runs against an undefined `localStorage`,
// defaulting to nothing paused — before this assignment. What makes the
// suite correct is `beforeEach` calling `__resetForTests()`, which re-reads
// the persisted set once the polyfill is in place. See
// app/resources/search/search.recents.test.ts for the same shape.
globalThis.localStorage = {
  _store: new Map<string, string>(),
  getItem(k: string) {
    return this._store.get(k) ?? null;
  },
  setItem(k: string, v: string) {
    this._store.set(k, v);
  },
  removeItem(k: string) {
    this._store.delete(k);
  },
  clear() {
    this._store.clear();
  },
  key(_index: number) {
    return null;
  },
  get length() {
    return this._store.size;
  },
} as Storage;

const KEY = ['dns-records', 'proj-1', 'zone-1'] as const;
const OTHER = ['dns-records', 'proj-1', 'zone-2'] as const;
// A key nothing on screen can pause or resume — a notification badge, a
// quota bridge, or any list watch that has not adopted the toggle.
const UNCONTROLLED = ['user-invitations'] as const;

/**
 * Stand in for the controls a mounted LiveUpdatesToggle / LiveUpdatesBanner
 * registers. Without this, `gate` treats the key as uncontrolled and lets
 * every update through — which is exactly what the control-registration
 * describe block asserts.
 */
function mountControls(...keys: (readonly unknown[])[]): () => void {
  const unregister = keys.map((key) => liveUpdatesStore.registerControl(key));
  return () => unregister.forEach((fn) => fn());
}

describe('liveUpdatesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
    mountControls(KEY, OTHER);
  });

  it('defaults to nothing paused when nothing is stored', () => {
    expect(liveUpdatesStore.isPaused(KEY)).toBe(false);
    expect(liveUpdatesStore.pausedCount()).toBe(0);
  });

  it('gate returns true and records no pending while nothing is paused', () => {
    expect(liveUpdatesStore.gate(KEY)).toBe(true);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
  });

  it('gate returns false and tallies pending for a paused key', () => {
    liveUpdatesStore.pause(KEY);
    expect(liveUpdatesStore.gate(KEY)).toBe(false);
    expect(liveUpdatesStore.gate(KEY)).toBe(false);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(2);
  });

  it('tallies pending per query key independently', () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.gate(KEY);
    liveUpdatesStore.gate(OTHER);
    liveUpdatesStore.gate(OTHER);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(1);
    expect(liveUpdatesStore.pendingFor(OTHER)).toBe(2);
  });

  it('clearPending resets one key without touching others', () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.gate(KEY);
    liveUpdatesStore.gate(OTHER);
    liveUpdatesStore.clearPending(KEY);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
    expect(liveUpdatesStore.pendingFor(OTHER)).toBe(1);
  });

  it("resuming a key clears only that key's pending tally", () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.gate(KEY);
    liveUpdatesStore.gate(OTHER);
    liveUpdatesStore.resume(KEY);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
    expect(liveUpdatesStore.pendingFor(OTHER)).toBe(1);
  });

  it('persists a paused key to localStorage as a JSON array of hashes', () => {
    liveUpdatesStore.pause(KEY);
    const raw = localStorage.getItem(LIVE_UPDATES_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual([hashKey(KEY)]);
  });

  it('round-trips the persisted paused set across a reset', () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.__resetForTests();
    expect(liveUpdatesStore.isPaused(KEY)).toBe(true);
    expect(liveUpdatesStore.isPaused(OTHER)).toBe(true);
    expect(liveUpdatesStore.pausedCount()).toBe(2);
  });

  it('restoring a legacy bare-string value reads as nothing paused', () => {
    // The old (pre-rename) storage shape was a bare 'paused'/'live' string
    // under a different key. Simulating that same shape landing under the
    // NEW key must not be misread as a one-element array.
    localStorage.setItem(LIVE_UPDATES_STORAGE_KEY, JSON.stringify('paused'));
    liveUpdatesStore.__resetForTests();
    expect(liveUpdatesStore.pausedCount()).toBe(0);
  });

  it('notifies subscribers when a key is paused', () => {
    let calls = 0;
    const unsubscribe = liveUpdatesStore.subscribe(() => {
      calls += 1;
    });
    liveUpdatesStore.pause(KEY);
    expect(calls).toBe(1);
    unsubscribe();
    liveUpdatesStore.resume(KEY);
    expect(calls).toBe(1);
  });

  it('notifies subscribers when a pending tally changes', () => {
    liveUpdatesStore.pause(KEY);
    let calls = 0;
    const unsubscribe = liveUpdatesStore.subscribe(() => {
      calls += 1;
    });
    liveUpdatesStore.gate(KEY);
    expect(calls).toBe(1);
    unsubscribe();
  });

  it('getServerSnapshot always reports nothing paused so SSR never renders a paused shell', () => {
    liveUpdatesStore.pause(KEY);
    expect(liveUpdatesStore.getServerSnapshot().paused.size).toBe(0);
  });

  it('survives a localStorage read that throws', () => {
    const original = globalThis.localStorage.getItem;
    globalThis.localStorage.getItem = () => {
      throw new Error('blocked');
    };
    try {
      liveUpdatesStore.__resetForTests();
      expect(liveUpdatesStore.pausedCount()).toBe(0);
    } finally {
      globalThis.localStorage.getItem = original;
    }
  });

  it('survives a localStorage accessor that throws on access', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('SecurityError');
      },
      configurable: true,
    });
    try {
      expect(() => liveUpdatesStore.__resetForTests()).not.toThrow();
      expect(liveUpdatesStore.pausedCount()).toBe(0);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});

describe('liveUpdatesStore per-table isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
    mountControls(KEY, OTHER);
  });

  it('pausing one key does not pause another', () => {
    liveUpdatesStore.pause(KEY);
    expect(liveUpdatesStore.isPaused(KEY)).toBe(true);
    expect(liveUpdatesStore.isPaused(OTHER)).toBe(false);
  });

  it('pausing key A does not hold updates for key B', () => {
    liveUpdatesStore.pause(KEY);
    expect(liveUpdatesStore.gate(KEY)).toBe(false);
    expect(liveUpdatesStore.gate(OTHER)).toBe(true);
    expect(liveUpdatesStore.pendingFor(OTHER)).toBe(0);
  });

  it('resuming one key leaves another paused key untouched', () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.resume(KEY);
    expect(liveUpdatesStore.isPaused(KEY)).toBe(false);
    expect(liveUpdatesStore.isPaused(OTHER)).toBe(true);
    expect(liveUpdatesStore.gate(OTHER)).toBe(false);
  });
});

describe('liveUpdatesStore paused-set cap', () => {
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
  });

  // Numbered keys stand in for many distinct zones/projects paused over a
  // long session — never actually rendered by any control, which is exactly
  // the case the cap exists for.
  function keyN(n: number): readonly unknown[] {
    return ['dns-records', 'proj-1', `zone-${n}`];
  }

  it('drops the oldest paused key once the cap is exceeded', () => {
    for (let i = 0; i < 51; i++) {
      liveUpdatesStore.pause(keyN(i));
    }
    expect(liveUpdatesStore.pausedCount()).toBe(50);
    expect(liveUpdatesStore.isPaused(keyN(0))).toBe(false);
    expect(liveUpdatesStore.isPaused(keyN(1))).toBe(true);
    expect(liveUpdatesStore.isPaused(keyN(50))).toBe(true);
  });

  it('persists no more than the cap to localStorage', () => {
    for (let i = 0; i < 60; i++) {
      liveUpdatesStore.pause(keyN(i));
    }
    const raw = localStorage.getItem(LIVE_UPDATES_STORAGE_KEY) as string;
    expect(JSON.parse(raw)).toHaveLength(50);
  });

  it('re-pausing an already-paused key does not refresh its eviction order', () => {
    liveUpdatesStore.pause(keyN(0));
    for (let i = 1; i < 51; i++) {
      liveUpdatesStore.pause(keyN(i));
    }
    // keyN(0) was the oldest and should already be evicted...
    expect(liveUpdatesStore.isPaused(keyN(0))).toBe(false);
    // ...and pausing it "again" is a fresh pause, not a no-op restore of an
    // evicted entry, so it now evicts whatever is currently oldest (keyN(1)).
    liveUpdatesStore.pause(keyN(0));
    expect(liveUpdatesStore.isPaused(keyN(0))).toBe(true);
    expect(liveUpdatesStore.isPaused(keyN(1))).toBe(false);
    expect(liveUpdatesStore.pausedCount()).toBe(50);
  });
});

describe('liveUpdatesStore paused-set cap prefers evicting unmounted keys', () => {
  // A reader who has zone Z1's table open and paused, then pauses 50 more
  // zones over a triage session without resuming any, must not have Z1
  // silently evicted just because it happens to be the oldest entry — it is
  // the one table on screen, and eviction has no way to tell the reader it
  // happened (no refetch runs, so the data goes stale with no cue).
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
  });

  function keyN(n: number): readonly unknown[] {
    return ['dns-records', 'proj-1', `zone-${n}`];
  }

  it('evicts the oldest UNMOUNTED key, leaving a mounted paused key intact even though it is oldest', () => {
    const unmountZ1 = mountControls(keyN(0)); // Z1 — on screen for the whole test
    liveUpdatesStore.pause(keyN(0)); // oldest pause, but mounted

    for (let i = 1; i <= 50; i++) {
      liveUpdatesStore.pause(keyN(i)); // 50 more, none mounted — the 51st pause overall triggers eviction
    }

    expect(liveUpdatesStore.pausedCount()).toBe(50);
    // Z1 survives despite being the oldest paused key.
    expect(liveUpdatesStore.isPaused(keyN(0))).toBe(true);
    // The oldest UNMOUNTED key is evicted in its place.
    expect(liveUpdatesStore.isPaused(keyN(1))).toBe(false);
    expect(liveUpdatesStore.isPaused(keyN(2))).toBe(true);

    unmountZ1();
  });

  it("clears the evicted key's pending tally, not just its pause", () => {
    // Every one of 51 keys mounted is the only case where the eviction
    // victim can be a MOUNTED key at all — an unmounted key can never have
    // accumulated a pending tally in the first place, since `gate()` only
    // tallies for a key with a registered control. This is the fallback
    // path from `chooseEvictionVictim`'s comment.
    const keys = Array.from({ length: 51 }, (_, i) => keyN(i));
    const unmountAll = mountControls(...keys);

    liveUpdatesStore.pause(keyN(0)); // will be the oldest, and the eviction victim
    liveUpdatesStore.gate(keyN(0)); // give it something to orphan
    expect(liveUpdatesStore.pendingFor(keyN(0))).toBe(1);

    for (let i = 1; i < 51; i++) {
      liveUpdatesStore.pause(keyN(i));
    }

    expect(liveUpdatesStore.isPaused(keyN(0))).toBe(false);
    expect(liveUpdatesStore.pendingFor(keyN(0))).toBe(0);

    unmountAll();
  });

  it('falls back to the oldest entry when every paused key is mounted', () => {
    const keys = Array.from({ length: 51 }, (_, i) => keyN(i));
    const unmountAll = mountControls(...keys);

    for (let i = 0; i < 51; i++) {
      liveUpdatesStore.pause(keyN(i));
    }

    expect(liveUpdatesStore.pausedCount()).toBe(50);
    // The oldest entry overall was evicted — there was no unmounted
    // candidate to prefer, so the cap still holds rather than growing past
    // it, which is the choice documented on `chooseEvictionVictim`.
    expect(liveUpdatesStore.isPaused(keyN(0))).toBe(false);
    expect(liveUpdatesStore.isPaused(keyN(1))).toBe(true);

    unmountAll();
  });
});

describe('liveUpdatesStore resumeAll', () => {
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
  });

  it('clears every paused key and notifies once', () => {
    mountControls(KEY, OTHER);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);

    let calls = 0;
    const unsubscribe = liveUpdatesStore.subscribe(() => {
      calls += 1;
    });
    liveUpdatesStore.resumeAll();
    unsubscribe();

    expect(calls).toBe(1);
    expect(liveUpdatesStore.pausedCount()).toBe(0);
    expect(liveUpdatesStore.isPaused(KEY)).toBe(false);
    expect(liveUpdatesStore.isPaused(OTHER)).toBe(false);
  });

  it('clears the persisted set too', () => {
    mountControls(KEY);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.resumeAll();
    const raw = localStorage.getItem(LIVE_UPDATES_STORAGE_KEY) as string;
    expect(JSON.parse(raw)).toEqual([]);
  });

  it('clears the pending tally for every key, mounted or not', () => {
    mountControls(KEY, OTHER);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.gate(KEY);
    liveUpdatesStore.gate(OTHER);
    liveUpdatesStore.resumeAll();
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
    expect(liveUpdatesStore.pendingFor(OTHER)).toBe(0);
  });

  it('returns only the paused keys that currently have a mounted control', () => {
    const unmountKey = mountControls(KEY);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER); // never mounted — e.g. a zone navigated away from
    unmountKey();
    mountControls(KEY); // remounted before resuming

    const result = liveUpdatesStore.resumeAll();
    expect(result).toEqual([KEY]);
  });

  it('returns nothing when no paused key is currently mounted', () => {
    mountControls(KEY);
    liveUpdatesStore.pause(KEY);
    // Reader navigated away — no control mounted for KEY anymore.
    liveUpdatesStore.__resetForTests();
    // __resetForTests re-reads the persisted paused set but clears controls.
    expect(liveUpdatesStore.isPaused(KEY)).toBe(true);
    expect(liveUpdatesStore.hasControl(KEY)).toBe(false);

    const result = liveUpdatesStore.resumeAll();
    expect(result).toEqual([]);
  });
});

describe('liveUpdatesStore pausedCount', () => {
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
  });

  it('is zero when nothing is paused', () => {
    expect(liveUpdatesStore.pausedCount()).toBe(0);
  });

  it('counts every paused key regardless of mounted controls', () => {
    // KEY has no mounted control — the count still includes it, since the
    // footer's resume-all control must surface pauses left behind on tables
    // the reader has since navigated away from.
    liveUpdatesStore.pause(KEY);
    mountControls(OTHER);
    liveUpdatesStore.pause(OTHER);
    expect(liveUpdatesStore.pausedCount()).toBe(2);
  });

  it('decreases when a key resumes', () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.resume(KEY);
    expect(liveUpdatesStore.pausedCount()).toBe(1);
  });

  it('agrees with selectPausedCount(getSnapshot())', () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    expect(liveUpdatesStore.pausedCount()).toBe(selectPausedCount(liveUpdatesStore.getSnapshot()));
  });
});

describe('liveUpdatesStore gate as a watch guard', () => {
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
    mountControls(KEY, OTHER);
  });

  it('lets a list update through while nothing is paused', () => {
    let applied = 0;
    const apply = () => {
      if (liveUpdatesStore.gate(KEY)) applied += 1;
    };
    apply();
    apply();
    expect(applied).toBe(2);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
  });

  it('holds list updates while paused and reports how many were held', () => {
    liveUpdatesStore.pause(KEY);
    let applied = 0;
    const apply = () => {
      if (liveUpdatesStore.gate(KEY)) applied += 1;
    };
    apply();
    apply();
    apply();
    expect(applied).toBe(0);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(3);
  });

  it('tallies exactly N for N successive gate calls on one key while paused', () => {
    // This is the property the hook-wiring placement change exists to
    // guarantee: one gate() call per watch event (not per debounced
    // refetch), so N events held while paused must produce a tally of N.
    liveUpdatesStore.pause(KEY);
    const N = 6;
    for (let i = 0; i < N; i++) {
      liveUpdatesStore.gate(KEY);
    }
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(N);
  });

  it('isHeld is a side-effect-free peek: it never touches the pending tally', () => {
    // use-resource-watch.ts calls isHeld() to decide whether to drop a
    // replayed ADDED event outright, separately from gate(). That peek must
    // never itself count as a suppressed update.
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.gate(KEY);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(1);

    for (let i = 0; i < 5; i++) {
      expect(liveUpdatesStore.isHeld(KEY)).toBe(true);
    }

    expect(liveUpdatesStore.pendingFor(KEY)).toBe(1);
  });
});

describe('liveUpdatesStore control registration', () => {
  // Pausing is per key and persisted, but the DNS Records table is the only
  // surface that offers a control. Gating every watch in the app on it
  // would silently freeze the notification badge, the quota displays, and
  // every other list page — across reloads, with no banner and no toggle
  // anywhere to explain or undo it. So a key is only gated while some
  // mounted UI has registered a control for it.
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
  });

  it('gates a paused key that has a registered control', () => {
    liveUpdatesStore.registerControl(KEY);
    liveUpdatesStore.pause(KEY);

    expect(liveUpdatesStore.gate(KEY)).toBe(false);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(1);
  });

  it('does not gate a paused key with no registered control', () => {
    liveUpdatesStore.pause(UNCONTROLLED);

    expect(liveUpdatesStore.gate(UNCONTROLLED)).toBe(true);
    expect(liveUpdatesStore.pendingFor(UNCONTROLLED)).toBe(0);
  });

  it('reports which keys have a control', () => {
    expect(liveUpdatesStore.hasControl(KEY)).toBe(false);
    const unmount = mountControls(KEY);
    expect(liveUpdatesStore.hasControl(KEY)).toBe(true);
    expect(liveUpdatesStore.hasControl(UNCONTROLLED)).toBe(false);
    unmount();
    expect(liveUpdatesStore.hasControl(KEY)).toBe(false);
  });

  it('keeps gating while any control for the key is still mounted', () => {
    // The toggle and the banner both register the same key. One unmounting
    // must not un-gate a table the other is still rendering for.
    const unmountToggle = liveUpdatesStore.registerControl(KEY);
    const unmountBanner = liveUpdatesStore.registerControl(KEY);
    liveUpdatesStore.pause(KEY);

    unmountToggle();
    expect(liveUpdatesStore.gate(KEY)).toBe(false);

    unmountBanner();
    expect(liveUpdatesStore.gate(KEY)).toBe(true);
  });

  it('stops gating a key once its last control unmounts', () => {
    const unmount = mountControls(KEY);
    liveUpdatesStore.pause(KEY);
    expect(liveUpdatesStore.gate(KEY)).toBe(false);

    unmount();

    expect(liveUpdatesStore.gate(KEY)).toBe(true);
    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
  });

  it('does not hold a replayed event for a key with no control', () => {
    // The replay branch in use-resource-watch drops events outright instead
    // of tallying them, so it never reaches gate(). Before it consulted
    // controls, a pause on this key would have silently swallowed the
    // notification badge's and the quota bridge's replays — both set
    // `skipInitialSync: false`, so every reconnect lands them here — with
    // no banner and no toggle anywhere to reveal or undo it.
    liveUpdatesStore.pause(UNCONTROLLED);

    expect(liveUpdatesStore.isHeld(UNCONTROLLED)).toBe(false);
  });

  it('holds a replayed event for a paused key that has a control', () => {
    mountControls(KEY);
    liveUpdatesStore.pause(KEY);

    expect(liveUpdatesStore.isHeld(KEY)).toBe(true);
  });

  it('holds nothing while not paused, control or not', () => {
    mountControls(KEY);

    expect(liveUpdatesStore.isHeld(KEY)).toBe(false);
    expect(liveUpdatesStore.isHeld(UNCONTROLLED)).toBe(false);
  });

  it('isHeld and gate agree for every key', () => {
    mountControls(KEY);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(UNCONTROLLED);

    for (const key of [KEY, UNCONTROLLED]) {
      expect(liveUpdatesStore.gate(key)).toBe(!liveUpdatesStore.isHeld(key));
    }
  });

  it('unregistering twice is a no-op the second time', () => {
    const unmountToggle = liveUpdatesStore.registerControl(KEY);
    liveUpdatesStore.registerControl(KEY); // the banner, still mounted
    liveUpdatesStore.pause(KEY);

    unmountToggle();
    unmountToggle();

    // A counter would have decremented past zero and taken the banner's
    // registration with it.
    expect(liveUpdatesStore.hasControl(KEY)).toBe(true);
    expect(liveUpdatesStore.gate(KEY)).toBe(false);
  });

  it('a stale unregister cannot un-gate a later mount of the same key', () => {
    // __resetForTests() between cypress tests can land before a previous
    // test's unmount cleanup has run.
    const staleUnmount = liveUpdatesStore.registerControl(KEY);
    liveUpdatesStore.__resetForTests();
    mountControls(KEY);
    liveUpdatesStore.pause(KEY);

    staleUnmount();

    expect(liveUpdatesStore.hasControl(KEY)).toBe(true);
    expect(liveUpdatesStore.gate(KEY)).toBe(false);
  });

  it('a stale unregister cannot drop a later mount tally', () => {
    const staleUnmount = liveUpdatesStore.registerControl(KEY);
    liveUpdatesStore.__resetForTests();
    mountControls(KEY);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.gate(KEY);
    liveUpdatesStore.gate(KEY);

    staleUnmount();

    expect(liveUpdatesStore.pendingFor(KEY)).toBe(2);
  });

  it('drops only the unmounted key tally, so no stale banner returns', () => {
    const unmountKey = mountControls(KEY);
    mountControls(OTHER);
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    liveUpdatesStore.gate(KEY);
    liveUpdatesStore.gate(OTHER);
    liveUpdatesStore.gate(OTHER);

    // The reader navigates away from KEY's table; OTHER stays on screen.
    unmountKey();

    expect(liveUpdatesStore.pendingFor(KEY)).toBe(0);
    expect(liveUpdatesStore.pendingFor(OTHER)).toBe(2);
  });
});

describe('selectLiveUpdatesSlice / liveUpdatesSliceEquality (per-key selector isolation)', () => {
  // This repo has no `@testing-library/react` / JSDOM adapter for bun:test
  // (see use-resource-watch.test.ts's note), so an actual React re-render
  // count isn't observable here. What IS observable, and is the real
  // mechanism `useLiveUpdates` relies on to skip a re-render, is whether two
  // slices compare equal under `liveUpdatesSliceEquality` —
  // `useSyncExternalStoreWithSelector` bails out of notifying a consumer
  // exactly when its selected value compares equal to the previous one.
  beforeEach(() => {
    localStorage.clear();
    liveUpdatesStore.__resetForTests();
    mountControls(KEY, OTHER);
  });

  it("does not change KEY's slice when only OTHER's tally moves", () => {
    liveUpdatesStore.pause(KEY);
    liveUpdatesStore.pause(OTHER);
    const before = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);

    liveUpdatesStore.gate(OTHER);

    const after = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);

    // Different snapshot objects (setSnapshot always allocates), but KEY's
    // own slice is unchanged — a consumer selecting KEY must not re-render.
    expect(liveUpdatesSliceEquality(before, after)).toBe(true);
    expect(after.pending).toBe(0);
  });

  it("does not change KEY's slice when only OTHER is paused or resumed", () => {
    const before = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);

    liveUpdatesStore.pause(OTHER);
    const afterPause = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);
    expect(liveUpdatesSliceEquality(before, afterPause)).toBe(true);

    liveUpdatesStore.resume(OTHER);
    const afterResume = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);
    expect(liveUpdatesSliceEquality(before, afterResume)).toBe(true);
  });

  it("changes KEY's slice when KEY's own tally moves", () => {
    liveUpdatesStore.pause(KEY);
    const before = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);

    liveUpdatesStore.gate(KEY);

    const after = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);

    expect(liveUpdatesSliceEquality(before, after)).toBe(false);
    expect(after.pending).toBe(1);
  });

  it("changes only KEY's slice when KEY alone is paused", () => {
    const beforeKey = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);
    const beforeOther = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), OTHER);

    liveUpdatesStore.pause(KEY);

    const afterKey = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), KEY);
    const afterOther = selectLiveUpdatesSlice(liveUpdatesStore.getSnapshot(), OTHER);

    expect(liveUpdatesSliceEquality(beforeKey, afterKey)).toBe(false);
    expect(liveUpdatesSliceEquality(beforeOther, afterOther)).toBe(true);
  });
});
