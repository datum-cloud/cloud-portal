import { DataTableRowActionsProps } from '../../core/data-table.types';
import { DataTableInlineActions } from './data-table-inline-actions';
import { MoreActions, MoreActionsProps } from '@/components/more-actions/more-actions';

const RowMoreActions = <TData,>({
  row,
  actions,
  disabled = false,
}: {
  row: TData;
  actions: MoreActionsProps<TData>[];
  disabled?: boolean;
}) => {
  return (
    <MoreActions
      row={row}
      actions={actions}
      disabled={disabled}
      className="size-6 border"
      iconClassName="size-3.5"
    />
  );
};

export const DataTableRowActions = <TData,>({
  row,
  rowId,
  actions,
  hideRowActions,
  disableRowActions,
  maxInlineActions = 3,
}: {
  row: TData;
  rowId?: string;
  actions: DataTableRowActionsProps<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number;
}) => {
  // Hide entire component if hideRowActions returns true
  if (hideRowActions?.(row)) {
    return null;
  }

  const isDisabled = disableRowActions?.(row) ?? false;

  // Split actions into inline and dropdown based on display property
  const inlineActions = actions.filter((action) => action.display === 'inline');
  const dropdownActions = actions.filter((action) => action.display !== 'inline');

  // Safety check: if too many inline actions, warn and fallback to all dropdown
  if (inlineActions.length > maxInlineActions) {
    console.warn(
      `DataTable: Too many inline actions (${inlineActions.length}). Maximum allowed is ${maxInlineActions}. All actions will be shown in dropdown.`
    );
    return (
      <RowMoreActions
        row={row}
        actions={actions as MoreActionsProps<TData>[]}
        disabled={isDisabled}
      />
    );
  }

  // If only dropdown actions (backward compatibility)
  if (inlineActions.length === 0) {
    return (
      <RowMoreActions
        row={row}
        actions={dropdownActions as MoreActionsProps<TData>[]}
        disabled={isDisabled}
      />
    );
  }

  // If only inline actions
  if (dropdownActions.length === 0) {
    return (
      <DataTableInlineActions
        row={row}
        rowId={rowId}
        actions={inlineActions}
        disabled={isDisabled}
      />
    );
  }

  // Mixed mode: both inline and dropdown
  return (
    <div className="flex items-center justify-end gap-2">
      <DataTableInlineActions
        row={row}
        rowId={rowId}
        actions={inlineActions}
        disabled={isDisabled}
      />
      <RowMoreActions
        row={row}
        actions={dropdownActions as MoreActionsProps<TData>[]}
        disabled={isDisabled}
      />
    </div>
  );
};
