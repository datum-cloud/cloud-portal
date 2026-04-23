import { getPolicyBindingColumns } from './policy-binding.columns';
import {
  DataTable,
  DataTablePanel,
  DataTableToolbar,
  createActionsColumn,
  useNuqsAdapter,
} from '@/components/data-table';
import type { PolicyBinding } from '@/resources/policy-bindings';
import type { ActionItem } from '@datum-cloud/datum-ui/data-table';
import type { ReactNode } from 'react';

export type PolicyBindingTableRowAction = Omit<ActionItem<PolicyBinding>, 'onClick'> & {
  action: (row: PolicyBinding) => void | Promise<void>;
  /** @deprecated No-op in the new DataTable API. Was used to show inline buttons in the old table. */
  display?: 'dropdown' | 'inline';
};

export type PolicyBindingTableProps = {
  bindings: PolicyBinding[];
  tableTitle?: {
    title?: string;
    description?: string;
    actions?: ReactNode;
  };
  rowActions?: PolicyBindingTableRowAction[];
};

export const PolicyBindingTable = ({
  bindings,
  tableTitle,
  rowActions = [],
}: PolicyBindingTableProps) => {
  const stateAdapter = useNuqsAdapter();

  const mappedActions: ActionItem<PolicyBinding>[] = rowActions.map(
    ({ action, display: _display, ...rest }) => ({
      ...rest,
      onClick: action,
    })
  );

  const columns = [
    ...getPolicyBindingColumns(),
    ...(mappedActions.length > 0 ? [createActionsColumn<PolicyBinding>(mappedActions)] : []),
  ];

  const actions = tableTitle?.actions ? [tableTitle.actions] : undefined;

  return (
    <DataTable.Client stateAdapter={stateAdapter} columns={columns} data={bindings ?? []} className="space-y-4">
      <DataTableToolbar
        title={tableTitle?.title}
        description={tableTitle?.description}
        actions={actions}
      />
      <DataTablePanel>
        <DataTable.Content emptyMessage="No roles found." />
        <DataTable.Pagination />
      </DataTablePanel>
    </DataTable.Client>
  );
};
