import { DataTableRowActionsProps } from './data-table.types'
import { MoreActions, MoreActionsProps } from '@/components/more-actions/more-actions'

export const DataTableRowActions = <TData,>({
  row,
  actions,
}: {
  row: TData
  actions: DataTableRowActionsProps<TData>[]
}) => {
  return <MoreActions row={row} actions={actions as MoreActionsProps<TData>[]} />
}
