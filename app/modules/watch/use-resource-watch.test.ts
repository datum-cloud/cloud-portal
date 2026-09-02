// app/modules/watch/use-resource-watch.test.ts
//
// Test scope adaptation note:
// -----------------------------------------------------------------------------
// This repo does NOT have `@testing-library/react` or any JSDOM/happy-dom
// adapter installed (see package.json — only `@testing-library/cypress`
// exists for E2E). bun:test runs in a Node-like environment with no DOM, so
// `renderHook` cannot drive `useResourceWatch` here. Following the pattern in
// app/features/search/engine/useSearchEngine.test.ts, the pause/replay
// decision is extracted into the pure, exported `classifyWatchEvent` and
// tested directly instead.
import {
  classifyWatchEvent,
  isCatchUpFetch,
  isWithinReplayWindow,
  nextReplayAnchor,
  planWatchEvent,
  watchEventIdentity,
} from './use-resource-watch';
import type { WatchEventType } from './watch.types';
import { describe, expect, it } from 'bun:test';

describe('classifyWatchEvent', () => {
  it('is ungated for single-resource watches, regardless of event type or replay window', () => {
    const eventTypes: WatchEventType[] = ['ADDED', 'MODIFIED', 'DELETED', 'ERROR', 'BOOKMARK'];
    for (const eventType of eventTypes) {
      expect(classifyWatchEvent({ hasName: true, eventType, isWithinReplayWindow: true })).toBe(
        'ungated'
      );
      expect(classifyWatchEvent({ hasName: true, eventType, isWithinReplayWindow: false })).toBe(
        'ungated'
      );
    }
  });

  it('is ungated for ERROR events on a list watch', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'ERROR', isWithinReplayWindow: false })
    ).toBe('ungated');
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'ERROR', isWithinReplayWindow: true })
    ).toBe('ungated');
  });

  it('is ungated for BOOKMARK events on a list watch', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'BOOKMARK', isWithinReplayWindow: false })
    ).toBe('ungated');
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'BOOKMARK', isWithinReplayWindow: true })
    ).toBe('ungated');
  });

  it('is replay for an ADDED list event inside the initial-sync replay window', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'ADDED', isWithinReplayWindow: true })
    ).toBe('replay');
  });

  it('is gated for an ADDED list event outside the replay window', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'ADDED', isWithinReplayWindow: false })
    ).toBe('gated');
  });

  it('is gated for MODIFIED list events regardless of the replay window', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'MODIFIED', isWithinReplayWindow: true })
    ).toBe('gated');
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'MODIFIED', isWithinReplayWindow: false })
    ).toBe('gated');
  });

  it('is gated for DELETED list events regardless of the replay window', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'DELETED', isWithinReplayWindow: true })
    ).toBe('gated');
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'DELETED', isWithinReplayWindow: false })
    ).toBe('gated');
  });
});

describe('the replay window across a reconnect', () => {
  // A reconnect can reopen the channel's upstream long after mount — see
  // WatchEventType.RESYNC. An anchor set once at mount leaves the window
  // closed by the time that replay lands: the regression this guards turns
  // a 40-record zone into "40 updates available" for rows already on
  // screen.
  const MOUNT = 1_000_000;
  const RETURN = MOUNT + 15_000; // 15s backgrounded — window long closed
  const REPLAY_SIZE = 40;

  function classifyAt(anchor: number, now: number, eventType: WatchEventType) {
    return classifyWatchEvent({
      hasName: false,
      eventType,
      isWithinReplayWindow: isWithinReplayWindow(anchor, now),
    });
  }

  it('classifies the RESYNC marker as resync, list or single-resource', () => {
    expect(
      classifyWatchEvent({ hasName: false, eventType: 'RESYNC', isWithinReplayWindow: false })
    ).toBe('resync');
    expect(
      classifyWatchEvent({ hasName: true, eventType: 'RESYNC', isWithinReplayWindow: false })
    ).toBe('resync');
  });

  it('re-anchors on RESYNC so a reconnect replay is never tallied', () => {
    let anchor = MOUNT;

    // The hub reports the channel (re)subscribed / resynced.
    const marker = classifyAt(anchor, RETURN, 'RESYNC');
    expect(marker).toBe('resync');
    anchor = nextReplayAnchor(anchor, marker, RETURN);

    // …and the whole zone replays a few ms later.
    for (let i = 0; i < REPLAY_SIZE; i++) {
      expect(classifyAt(anchor, RETURN + 10 + i, 'ADDED')).toBe('replay');
    }
  });

  it('leaves the anchor alone for every non-resync disposition', () => {
    expect(nextReplayAnchor(MOUNT, 'gated', RETURN)).toBe(MOUNT);
    expect(nextReplayAnchor(MOUNT, 'replay', RETURN)).toBe(MOUNT);
    expect(nextReplayAnchor(MOUNT, 'ungated', RETURN)).toBe(MOUNT);
  });

  it('still tallies a genuine ADDED once the re-opened window closes', () => {
    const anchor = nextReplayAnchor(MOUNT, 'resync', RETURN);
    expect(classifyAt(anchor, RETURN + 2_500, 'ADDED')).toBe('gated');
  });

  it('without a RESYNC the same replay is tallied — the bug this guards', () => {
    // Mount-only anchoring, i.e. the pre-fix behaviour, stated as an
    // executable contrast rather than prose.
    expect(classifyAt(MOUNT, RETURN + 10, 'ADDED')).toBe('gated');
  });
});

describe('isWithinReplayWindow', () => {
  it('is open at the anchor and closed at the 2s boundary', () => {
    expect(isWithinReplayWindow(0, 0)).toBe(true);
    expect(isWithinReplayWindow(0, 1_999)).toBe(true);
    expect(isWithinReplayWindow(0, 2_000)).toBe(false);
  });
});

describe('planWatchEvent keeps the mount clock and the replay clock apart', () => {
  // The replay anchor moves on every reconnect. The mount time must not,
  // because it is what `skipInitialSync` is keyed on — and that skip
  // short-circuits `case 'ADDED'` before `debouncedInvalidate()`.
  //
  // With `refetchOnWindowFocus: false` and a 5-minute `staleTime`
  // (app/modules/tanstack/query.ts), that invalidate is the only path that
  // repairs a list after a connection gap. A replay carries no DELETED
  // events, so a deletion that happened while the tab was backgrounded is
  // recoverable there and nowhere else. Re-arming the skip on reconnect
  // would leave a deleted row on screen indefinitely.
  const MOUNT = 1_000_000;
  const RETURN = MOUNT + 30_000; // 30s backgrounded

  const listWatch = {
    hasName: false,
    skipInitialSync: true, // the default, and what every list but DNS records uses
    mountedAt: MOUNT,
  } as const;

  it('re-arms nothing on reconnect: the replay still reaches the invalidate', () => {
    // The hub reports the channel resynced; the replay window re-opens.
    const marker = planWatchEvent({
      ...listWatch,
      eventType: 'RESYNC',
      replayAnchor: MOUNT,
      now: RETURN,
    });
    expect(marker.disposition).toBe('resync');
    expect(marker.replayAnchor).toBe(RETURN);

    // The replayed list arrives right behind it.
    const replayed = planWatchEvent({
      ...listWatch,
      eventType: 'ADDED',
      replayAnchor: marker.replayAnchor,
      now: RETURN + 10,
    });

    // Not tallied — the reader is looking at these rows already.
    expect(replayed.disposition).toBe('replay');
    // …but NOT skipped: this is the invalidate that repairs a deletion
    // missed during the gap.
    expect(replayed.skipsInitialSyncAdded).toBe(false);
  });

  it('still skips the genuine initial-sync replay at mount', () => {
    const atMount = planWatchEvent({
      ...listWatch,
      eventType: 'ADDED',
      replayAnchor: MOUNT,
      now: MOUNT + 10,
    });
    expect(atMount.disposition).toBe('replay');
    expect(atMount.skipsInitialSyncAdded).toBe(true);
  });

  it('never skips when the caller opted out of skipInitialSync', () => {
    // DNS records, invitations, allowance buckets.
    const plan = planWatchEvent({
      hasName: false,
      skipInitialSync: false,
      mountedAt: MOUNT,
      eventType: 'ADDED',
      replayAnchor: MOUNT,
      now: MOUNT + 10,
    });
    expect(plan.disposition).toBe('replay');
    expect(plan.skipsInitialSyncAdded).toBe(false);
  });

  it('only ever skips ADDED', () => {
    for (const eventType of ['MODIFIED', 'DELETED', 'BOOKMARK', 'ERROR'] as WatchEventType[]) {
      expect(
        planWatchEvent({ ...listWatch, eventType, replayAnchor: MOUNT, now: MOUNT + 10 })
          .skipsInitialSyncAdded
      ).toBe(false);
    }
  });

  it('leaves the replay anchor alone for everything but a resync', () => {
    const plan = planWatchEvent({
      ...listWatch,
      eventType: 'MODIFIED',
      replayAnchor: MOUNT,
      now: RETURN,
    });
    expect(plan.replayAnchor).toBe(MOUNT);
  });
});

describe('watchEventIdentity', () => {
  it('prefers uid, which is unique and stable for the object lifetime', () => {
    expect(watchEventIdentity({ metadata: { uid: 'u-1', name: 'rec', namespace: 'ns' } })).toBe(
      'u-1'
    );
  });

  it('falls back to namespace/name when uid is absent', () => {
    expect(watchEventIdentity({ metadata: { name: 'rec', namespace: 'ns' } })).toBe('ns/rec');
  });

  it('uses a bare name when there is no namespace', () => {
    expect(watchEventIdentity({ metadata: { name: 'rec' } })).toBe('rec');
  });

  it('returns undefined when the event identifies nothing', () => {
    // The tally then counts this event on its own rather than risk
    // collapsing it into an unrelated resource.
    expect(watchEventIdentity({})).toBeUndefined();
    expect(watchEventIdentity(undefined)).toBeUndefined();
    expect(watchEventIdentity({ metadata: {} })).toBeUndefined();
    expect(watchEventIdentity({ metadata: { uid: '', name: '' } })).toBeUndefined();
  });
});

/**
 * A completed fetch is the catch-up; a cache write is not. Getting this
 * wrong in either direction is a bug the reader sees: too loose and a
 * mutation writing its own row silently clears updates it never showed
 * them, too tight and the count outlives the data it describes.
 */
describe('isCatchUpFetch', () => {
  const HASH = 'target-hash';
  const fetched = { type: 'updated', action: { type: 'success' }, query: { queryHash: HASH } };

  it('accepts a completed fetch of the watched query', () => {
    expect(isCatchUpFetch(fetched, HASH)).toBe(true);
  });

  it('rejects a setQueryData write, which is not a catch-up', () => {
    expect(
      isCatchUpFetch(
        { type: 'updated', action: { type: 'setState' }, query: { queryHash: HASH } },
        HASH
      )
    ).toBe(false);
  });

  it('rejects a fetch of a different query', () => {
    expect(isCatchUpFetch({ ...fetched, query: { queryHash: 'other' } }, HASH)).toBe(false);
  });

  it('rejects non-update cache events', () => {
    expect(isCatchUpFetch({ ...fetched, type: 'added' }, HASH)).toBe(false);
    expect(isCatchUpFetch({ ...fetched, type: 'removed' }, HASH)).toBe(false);
  });

  it('rejects an event with no action or query', () => {
    expect(isCatchUpFetch({ type: 'updated' }, HASH)).toBe(false);
  });
});
