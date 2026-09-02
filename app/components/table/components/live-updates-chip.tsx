import { useLiveUpdates } from './live-updates-toggle';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { RefreshCcwIcon } from 'lucide-react';

/**
 * Copy is deliberately "updates", not "new records": the tally counts
 * modifications and deletions too.
 */
interface LiveUpdatesChipProps {
  queryKey: readonly unknown[];
}

/**
 * Above this, the exact count stops being useful information and the chip
 * shows `99+` instead. A session left paused for a long time can tally into
 * the tens of thousands; the cap keeps the chip readable regardless.
 */
const MAX_DISPLAYED_PENDING = 99;

/**
 * Compact catch-up chip. Renders immediately after `LiveUpdatesToggle` —
 * see `client.tsx`, which composes the two into a single `searchTrailing`
 * node so they mount and unmount together by construction — only while this
 * table is BOTH paused AND holding at least one update.
 *
 * Clicking calls `catchUp` alone: it refetches and clears this table's tally
 * WITHOUT touching the pause preference. "Show me what I'm missing" must
 * not silently turn live updates back on for a reader who deliberately
 * paused this table — see `useLiveUpdates`.
 */
export function LiveUpdatesChip({ queryKey }: LiveUpdatesChipProps) {
  const { isPaused, pending, catchUp } = useLiveUpdates(queryKey);

  if (!isPaused || pending === 0) return null;

  const displayPending = pending > MAX_DISPLAYED_PENDING ? `${MAX_DISPLAYED_PENDING}+` : pending;
  const label = `${displayPending} ${pending === 1 ? 'update' : 'updates'} available — refresh without resuming`;

  return (
    <Tooltip message={label}>
      <Button
        data-e2e="live-updates-chip"
        htmlType="button"
        type="quaternary"
        theme="outline"
        size="small"
        aria-label={label}
        onClick={catchUp}
        className="h-9 gap-1.5">
        <Icon icon={RefreshCcwIcon} className="size-3.5" />
        {displayPending} {pending === 1 ? 'update' : 'updates'}
      </Button>
    </Tooltip>
  );
}
