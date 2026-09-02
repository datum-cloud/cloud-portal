import {
  liveUpdatesStore,
  liveUpdatesSliceEquality,
  selectLiveUpdatesSlice,
} from '@/modules/watch';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { hashKey, useQueryClient } from '@tanstack/react-query';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

/**
 * Reads THIS query key's own pause state and pending tally, and registers
 * the key as one the pause is allowed to act on.
 *
 * Pausing is per table: `pause`/`resume` act on this key alone, and
 * `liveUpdatesStore.gate` holds updates only for query keys with a mounted
 * control, which this hook registers. Everything with no toggle and no
 * chip for THIS key — the notification badge, quota bridges, every other
 * table, and every list watch that has not adopted `liveUpdates` — keeps
 * updating live. Pausing must never freeze a surface that cannot show or
 * undo it.
 *
 * `catchUp` clears this query's pending tally and refetches it WITHOUT
 * resuming — this is what clicking `LiveUpdatesChip` does. "Show me what
 * I'm missing" must not silently turn live updates back on for a reader who
 * deliberately paused this table.
 *
 * `resume` clears only this key's pending tally, not any other paused
 * table's — see `liveUpdatesStore.resume`.
 */
export function useLiveUpdates(queryKey: readonly unknown[]) {
  // `queryKey` is typically a fresh array literal every render, so effects
  // and memoised callbacks key on its hash instead of its identity and read
  // the live value from a ref. Registration is what makes this key gateable
  // at all.
  const keyHash = hashKey(queryKey);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const queryClient = useQueryClient();

  // Selects only this key's slice (isPaused + this key's own pending count)
  // and compares it by value, so a tally bump for a DIFFERENT query key
  // notifies this store subscriber without re-rendering this consumer.
  const { isPaused, pending } = useSyncExternalStoreWithSelector(
    liveUpdatesStore.subscribe,
    liveUpdatesStore.getSnapshot,
    liveUpdatesStore.getServerSnapshot,
    (snapshot) => selectLiveUpdatesSlice(snapshot, queryKey, keyHash),
    liveUpdatesSliceEquality
  );

  useEffect(() => liveUpdatesStore.registerControl(queryKeyRef.current), [keyHash]);

  // Keyed on `keyHash`, not `queryKey` — `queryKey` is a fresh array every
  // render, which would recreate these callbacks every render too,
  // defeating the memoisation. `queryKeyRef` supplies the current key
  // without adding it as a dependency.
  const pause = useCallback(() => liveUpdatesStore.pause(queryKeyRef.current), [keyHash]);

  const catchUp = useCallback(() => {
    liveUpdatesStore.clearPending(queryKeyRef.current);
    queryClient.invalidateQueries({ queryKey: [...queryKeyRef.current] });
  }, [queryClient, keyHash]);

  const resume = useCallback(() => {
    catchUp();
    liveUpdatesStore.resume(queryKeyRef.current);
  }, [catchUp, keyHash]);

  return {
    isPaused,
    pending,
    pause,
    resume,
    catchUp,
  };
}

const SCOPE_NOTE = 'this table only';

interface LiveUpdatesToggleProps {
  queryKey: readonly unknown[];
}

/**
 * A dynamic label and NO `aria-pressed`, deliberately.
 *
 * Carrying both said "Resume live updates, pressed" while paused, which
 * reads as though resume is the state already in effect. The two honest
 * options are a static label with `aria-pressed` carrying the state, or a
 * label that changes with the state and no `aria-pressed` — the ARIA
 * authoring practices say not to combine them.
 *
 * The dynamic label wins here because the tooltip shows that same string as
 * visible text and swaps with the icon (Play means resume). A static
 * "Pause live updates" label over a Play icon would contradict what a
 * sighted reader sees, and would leave the accessible name out of step with
 * the visible one (WCAG 2.5.3, Label in Name).
 *
 * Styled to match `TagFilter` (`h-9`, bordered, icon + short label) so it
 * reads as a toolbar control sitting beside the search input rather than a
 * bare icon button. The visible label is intentionally the short state word
 * ("Live" / "Paused") — the full scoped sentence lives in the tooltip and
 * `aria-label`, same as before.
 */
export function LiveUpdatesToggle({ queryKey }: LiveUpdatesToggleProps) {
  const { isPaused, pause, resume } = useLiveUpdates(queryKey);

  const label = isPaused
    ? `Resume live updates — ${SCOPE_NOTE}`
    : `Pause live updates — ${SCOPE_NOTE}`;

  return (
    <Tooltip message={label}>
      <Button
        data-e2e="live-updates-toggle"
        htmlType="button"
        type="quaternary"
        theme="outline"
        size="small"
        aria-label={label}
        onClick={isPaused ? resume : pause}
        className="h-9 gap-1.5">
        <Icon icon={isPaused ? PlayIcon : PauseIcon} className="size-3.5" />
        {isPaused ? 'Paused' : 'Live'}
      </Button>
    </Tooltip>
  );
}
