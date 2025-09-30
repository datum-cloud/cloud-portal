import { getPolicyBindingColumns } from './policy-bindings.columns';
import { DataTable } from '@/components/data-table/data-table';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';

export type PolicyBindingsTableProps = {
  bindings: IPolicyBindingControlResponse[];
};

export const PolicyBindingsTable = ({ bindings }: PolicyBindingsTableProps) => {
  const columns = getPolicyBindingColumns();

  return (
    <DataTable
      columns={columns}
      data={bindings ?? []}
      emptyContent={{ title: 'No Policy Binding found.' }}
    />
  );
};
