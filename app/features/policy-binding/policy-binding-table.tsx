import { getPolicyBindingColumns } from './policy-binding.columns';
import { Table, createActionsColumn } from '@/components/table';
import type { EmptyContentConfig } from '@/components/table/types';
import { syncKey } from '@/modules/watch/sync-state';
import { POLICY_BINDING_SYNC_KIND, type PolicyBinding } from '@/resources/policy-bindings';
import type { ActionItem } from '@datum-cloud/datum-ui/data-table';
import type { ReactNode } from 'react';

export type PolicyBindingTableRowAction = Omit<ActionItem<PolicyBinding>, 'onClick'> & {
  action: (row: PolicyBinding) => void | Promise<void>;
  /** @deprecated No-op in the new DataTable API. Was used to show inline buttons in the old table. */
  display?: 'dropdown' | 'inline';
};

export type PolicyBindingTableProps = {
  bindings: PolicyBinding[];
  empty?: string | EmptyContentConfig;
  tableTitle?: {
    title?: string;
    description?: string;
    actions?: ReactNode;
  };
  rowActions?: PolicyBindingTableRowAction[];
  onRowClick?: (row: PolicyBinding) => void;
  /** The org or project id the bindings belong to; scopes their row states. */
  syncScope: string;
};

export const PolicyBindingTable = ({
  bindings,
  empty,
  tableTitle,
  rowActions = [],
  onRowClick,
  syncScope,
}: PolicyBindingTableProps) => {
  const mappedActions: ActionItem<PolicyBinding>[] = rowActions.map(
    ({ action, display: _display, ...rest }) => ({
      ...rest,
      onClick: action,
    })
  );

  const columns = [
    ...getPolicyBindingColumns(syncScope),
    ...(mappedActions.length > 0 ? [createActionsColumn<PolicyBinding>(mappedActions)] : []),
  ];

  const actions = tableTitle?.actions ? [tableTitle.actions] : undefined;

  return (
    <Table.Client
      columns={columns}
      data={bindings ?? []}
      getRowSyncKey={(row) => syncKey(POLICY_BINDING_SYNC_KIND, syncScope, row.name)}
      title={tableTitle?.title}
      description={tableTitle?.description}
      actions={actions}
      onRowClick={onRowClick}
      empty={empty ?? 'no roles found'}
    />
  );
};
