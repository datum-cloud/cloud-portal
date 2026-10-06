import { ROW_SYNC_COPY } from '../row-sync-copy';
import type { RowAction, RowData } from '../types';
import { InlineActions } from './inline-actions';
import { isTableRowLocked, useRowSyncKey } from './row-sync-context';
import { useRowSyncState } from '@/modules/watch/use-row-sync-state';
import type { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { MoreActions } from '@datum-cloud/datum-ui/more-actions';
import { useId, type ReactNode } from 'react';

const MAX_INLINE_ACTIONS_DEFAULT = 3;

function resolveHidden<TData extends RowData>(
  hidden: RowAction<TData>['hidden'],
  row: TData
): boolean {
  if (typeof hidden === 'function') return hidden(row);
  return hidden ?? false;
}

/**
 * Adapt our widened `RowAction` to datum-ui's `ActionItem` for `MoreActions`.
 * Our tooltip type allows any ReactNode (or a function returning one) so
 * inline buttons can show rich content; MoreActions only accepts strings, so
 * we coerce: strings pass through, functions are wrapped to stringify their
 * result, anything else is dropped (undefined).
 */
function toActionItems<TData extends RowData>(actions: RowAction<TData>[]): ActionItem<TData>[] {
  return actions.map((action) => {
    const { tooltip, ...rest } = action;
    if (typeof tooltip === 'string') {
      return { ...rest, tooltip };
    }
    if (typeof tooltip === 'function') {
      return {
        ...rest,
        tooltip: (data: TData) => {
          const result = tooltip(data);
          return typeof result === 'string' ? result : '';
        },
      };
    }
    return rest as ActionItem<TData>;
  });
}

// When locked, the reason is sr-only text in the cell: the menu trigger takes no aria-describedby.
function ActionsCell({
  className,
  lockedReasonId,
  children,
}: {
  className: string;
  lockedReasonId: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="dt-row-actions"
      className={className}
      title={lockedReasonId ? ROW_SYNC_COPY.locked : undefined}>
      {children}
      {lockedReasonId && (
        <span id={lockedReasonId} className="sr-only">
          {ROW_SYNC_COPY.locked}
        </span>
      )}
    </div>
  );
}

/**
 * Row-actions renderer — ported from the fork's `DataTableRowActions`.
 * Splits actions into `display: 'inline'` buttons and dropdown entries,
 * then renders one of three branches:
 *
 * - **Inline-only**: render just the `<InlineActions />` row.
 * - **Dropdown-only**: render a single kebab-menu via `MoreActions`.
 * - **Mixed**: render inline buttons followed by the kebab menu.
 *
 * Safety cap: if inline actions exceed `maxInlineActions` (default 3), the
 * component falls back to rendering **all** actions in the dropdown and
 * emits a dev warning. This guards against accidental layout explosions
 * when a consumer forgets to filter.
 *
 * Gates:
 * - `hideRowActions(row)` — suppresses the entire cell for that row.
 * - `disableRowActions(row)` — disables every action (inline AND dropdown).
 * - A sync-locked row (pending, removing) disables every action.
 */
export function RowActions<TData extends RowData>({
  row,
  actions,
  hideRowActions,
  disableRowActions,
  maxInlineActions = MAX_INLINE_ACTIONS_DEFAULT,
}: {
  row: TData;
  actions: RowAction<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number;
}) {
  const syncKey = useRowSyncKey(row);
  const syncState = useRowSyncState(syncKey);
  const reasonId = useId();

  if (hideRowActions?.(row)) return null;

  const syncLocked = isTableRowLocked(syncKey, syncState);
  const lockedReasonId = syncLocked ? reasonId : undefined;
  const isDisabled = syncLocked || (disableRowActions?.(row) ?? false);
  // Filter hidden actions before bucketing so that `hidden` gates the
  // mutual-exclusion pattern (e.g. "resend" vs "cancel" on different
  // invitation states) without tripping the inline safety cap.
  const visible = actions.filter((action) => !resolveHidden(action.hidden, row));
  const inlineActions = visible.filter((action) => action.display === 'inline');
  const dropdownActions = visible.filter((action) => action.display !== 'inline');

  if (inlineActions.length > maxInlineActions) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Table] Too many inline actions (${inlineActions.length}). Maximum allowed is ${maxInlineActions}. All actions will be shown in the dropdown.`
      );
    }
    return (
      <ActionsCell className="inline-flex" lockedReasonId={lockedReasonId}>
        <MoreActions
          row={row}
          // Use `visible`, not `actions`: hidden gates must still suppress
          // their entries even when the safety cap collapses inline actions
          // into the dropdown.
          actions={toActionItems(visible)}
          disabled={isDisabled}
          className="size-6 border"
          iconClassName="size-3.5"
        />
      </ActionsCell>
    );
  }

  if (inlineActions.length === 0) {
    return (
      <ActionsCell className="inline-flex" lockedReasonId={lockedReasonId}>
        <MoreActions
          row={row}
          actions={toActionItems(dropdownActions)}
          disabled={isDisabled}
          className="size-6 border"
          iconClassName="size-3.5"
        />
      </ActionsCell>
    );
  }

  if (dropdownActions.length === 0) {
    return (
      <ActionsCell className="flex justify-end" lockedReasonId={lockedReasonId}>
        <InlineActions<TData>
          row={row}
          actions={inlineActions}
          disabled={isDisabled}
          describedBy={lockedReasonId}
        />
      </ActionsCell>
    );
  }

  return (
    <ActionsCell className="flex items-center justify-end gap-2" lockedReasonId={lockedReasonId}>
      <InlineActions<TData>
        row={row}
        actions={inlineActions}
        disabled={isDisabled}
        describedBy={lockedReasonId}
      />
      <MoreActions
        row={row}
        actions={toActionItems(dropdownActions)}
        disabled={isDisabled}
        className="size-6 border"
        iconClassName="size-3.5"
      />
    </ActionsCell>
  );
}
