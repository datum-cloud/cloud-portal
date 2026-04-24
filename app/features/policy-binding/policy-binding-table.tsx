import { getPolicyBindingColumns } from './policy-binding.columns';
import { Table, createActionsColumn } from '@/components/table';
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
  onRowClick?: (row: PolicyBinding) => void;
};

export const PolicyBindingTable = ({
  bindings,
  tableTitle,
  rowActions = [],
  onRowClick,
}: PolicyBindingTableProps) => {
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
    <Table.Client
      columns={columns}
      data={bindings ?? []}
      title={tableTitle?.title}
      description={tableTitle?.description}
      actions={actions}
      onRowClick={onRowClick}
      empty="No roles found."
    />
  );
};
