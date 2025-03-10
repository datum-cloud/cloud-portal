import { MoreActions, MoreActionsProps } from '../more-actions/more-actions'
import { DataTableRowActionsProps } from './data-table.types'

export const DataTableRowActions = <TData,>({
  row,
  actions,
}: {
  row: TData
  actions: DataTableRowActionsProps<TData>[]
}) => {
  return <MoreActions row={row} actions={actions as MoreActionsProps<TData>[]} />
}
