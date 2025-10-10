import { DataTableRowActionsProps } from './data-table.types';
import { MoreActions, MoreActionsProps } from '@/components/more-actions/more-actions';

export const DataTableRowActions = <TData,>({
  row,
  actions,
  hideRowActions,
  disableRowActions,
}: {
  row: TData;
  actions: DataTableRowActionsProps<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
}) => {
  // Hide entire component if hideRowActions returns true
  if (hideRowActions?.(row)) {
    return null;
  }

  const isDisabled = disableRowActions?.(row) ?? false;

  return (
    <MoreActions
      row={row}
      actions={actions as MoreActionsProps<TData>[]}
      disabled={isDisabled}
      className="border"
    />
  );
};
