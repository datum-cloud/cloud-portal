import { getPolicyBindingColumns } from './policy-binding.columns';
import { DataTable } from '@/components/data-table/data-table';
import {
  DataTableRowActionsProps,
  DataTableTitleProps,
} from '@/components/data-table/data-table.types';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';

export type PolicyBindingTableProps = {
  bindings: IPolicyBindingControlResponse[];
  tableTitle?: DataTableTitleProps;
  rowActions?: DataTableRowActionsProps<IPolicyBindingControlResponse>[];
  onRowClick?: (row: IPolicyBindingControlResponse) => void;
};

export const PolicyBindingTable = ({
  bindings,
  tableTitle,
  rowActions = [],
  onRowClick,
}: PolicyBindingTableProps) => {
  const columns = getPolicyBindingColumns();

  return (
    <DataTable
      columns={columns}
      data={bindings ?? []}
      onRowClick={onRowClick}
      emptyContent={{ title: 'No Policy Binding found.' }}
      tableTitle={tableTitle}
      rowActions={rowActions}
    />
  );
};
