import { ROW_SYNC_COPY } from '../row-sync-copy';
import { SYNC_COPY } from '@/modules/watch/sync-copy';
import { isPendingSyncState } from '@/modules/watch/sync-state';
import { useRowSyncState } from '@/modules/watch/use-row-sync-state';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import type { ReactNode } from 'react';

interface RowSyncNameProps {
  /** Must match the table's `getRowSyncKey` for this row. */
  syncKey: string | undefined;
  children: ReactNode;
}

/** Name cell with a pending spinner; sr-only "Saving…" because the spinner alone is visual. */
export function RowSyncName({ syncKey, children }: RowSyncNameProps) {
  const state = useRowSyncState(syncKey);
  const pending = isPendingSyncState(state);

  return (
    <span
      data-slot="row-sync-name"
      aria-busy={pending || undefined}
      className="inline-flex min-w-0 items-center gap-2">
      {pending && <SpinnerIcon size="xs" aria-hidden="true" data-slot="row-sync-spinner" />}
      <span data-slot="row-sync-label" className="min-w-0">
        {children}
      </span>
      {(state === 'pending-create' || state === 'pending-update') && (
        <span className="sr-only">{ROW_SYNC_COPY.saving}</span>
      )}
      {state === 'pending-delete' && (
        <Text as="span" size="xs" textColor="muted">
          {SYNC_COPY.deleting}
        </Text>
      )}
    </span>
  );
}
