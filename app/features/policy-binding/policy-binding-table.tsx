import { getPolicyBindingColumns } from './policy-binding.columns';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import {
  DataTableRowActionsProps,
  DataTableTitleProps,
} from '@/modules/datum-ui/components/data-table';
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
