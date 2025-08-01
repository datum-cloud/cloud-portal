import { DataTableRowActionsProps } from './data-table.types';
import { MoreAction, MoreActionProps } from '@/components/common/more-action';

export const DataTableRowActions = <TData,>({
  row,
  actions,
}: {
  row: TData;
  actions: DataTableRowActionsProps<TData>[];
}) => {
  return <MoreAction row={row} actions={actions as MoreActionProps<TData>[]} />;
};
