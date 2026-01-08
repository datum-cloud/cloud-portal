import { getPolicyBindingColumns } from './policy-binding.columns';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import {
  DataTableRowActionsProps,
  DataTableTitleProps,
} from '@/modules/datum-ui/components/data-table';
import type { PolicyBinding } from '@/resources/policy-bindings';

export type PolicyBindingTableProps = {
  bindings: PolicyBinding[];
  tableTitle?: DataTableTitleProps;
  rowActions?: DataTableRowActionsProps<PolicyBinding>[];
  onRowClick?: (row: PolicyBinding) => void;
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
