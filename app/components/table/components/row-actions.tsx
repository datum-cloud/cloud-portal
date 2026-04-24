import type { RowAction } from '../types';
import { InlineActions } from './inline-actions';
import type { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { MoreActions } from '@datum-cloud/datum-ui/more-actions';

const MAX_INLINE_ACTIONS_DEFAULT = 3;

function resolveHidden<TData>(hidden: RowAction<TData>['hidden'], row: TData): boolean {
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
function toActionItems<TData>(actions: RowAction<TData>[]): ActionItem<TData>[] {
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
 */
export function RowActions<TData>({
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
  if (hideRowActions?.(row)) return null;

  const isDisabled = disableRowActions?.(row) ?? false;
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
      <div data-slot="dt-row-actions" className="inline-flex">
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
      </div>
    );
  }

  if (inlineActions.length === 0) {
    return (
      <div data-slot="dt-row-actions" className="inline-flex">
        <MoreActions
          row={row}
          actions={toActionItems(dropdownActions)}
          disabled={isDisabled}
          className="size-6 border"
          iconClassName="size-3.5"
        />
      </div>
    );
  }

  if (dropdownActions.length === 0) {
    return (
      <div data-slot="dt-row-actions" className="flex justify-end">
        <InlineActions<TData> row={row} actions={inlineActions} disabled={isDisabled} />
      </div>
    );
  }

  return (
    <div data-slot="dt-row-actions" className="flex items-center justify-end gap-2">
      <InlineActions<TData> row={row} actions={inlineActions} disabled={isDisabled} />
      <MoreActions
        row={row}
        actions={toActionItems(dropdownActions)}
        disabled={isDisabled}
        className="size-6 border"
        iconClassName="size-3.5"
      />
    </div>
  );
}
