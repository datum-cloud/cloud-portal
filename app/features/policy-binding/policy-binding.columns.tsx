import {
  renderCreatedAtCell,
  renderResourceCell,
  renderSubjectsCell,
} from './policy-binding.helpers';
import { displayBindingName } from './policy-binding.name';
import { PolicyBindingColumn } from './policy-binding.types';
import { RowSyncName } from '@/components/table';
import { syncKey } from '@/modules/watch/sync-state';
import { POLICY_BINDING_SYNC_KIND } from '@/resources/policy-bindings';

/** `syncScope` is the org or project id the bindings belong to. */
export const getPolicyBindingColumns = (syncScope: string): PolicyBindingColumn[] => [
  {
    header: 'Resource Name',
    accessorKey: 'name',
    meta: {
      className: 'max-w-[250px]',
    },
    cell: ({ row }) => (
      <RowSyncName syncKey={syncKey(POLICY_BINDING_SYNC_KIND, syncScope, row.original.name)}>
        <span className="text-primary font-semibold break-words whitespace-normal">
          {displayBindingName(row.original.name)}
        </span>
      </RowSyncName>
    ),
  },
  {
    header: 'Role',
    accessorKey: 'roleRef',
    meta: {
      className: 'max-w-[250px]',
    },
    cell: ({ row }) => (
      <span className="break-words whitespace-normal">{row.original.roleRef?.name ?? '-'}</span>
    ),
  },
  {
    header: 'Resource',
    accessorKey: 'resourceSelector',
    meta: {
      className: 'max-w-[200px]',
    },
    cell: ({ row }) => renderResourceCell(row.original.resourceSelector),
  },
  {
    header: 'Subjects',
    accessorKey: 'subjects',
    enableSorting: false,
    meta: {
      className: 'w-[80px] flex items-center justify-center',
    },
    cell: ({ row }) => renderSubjectsCell(row.original.subjects),
  },
  {
    header: 'Created At',
    accessorKey: 'createdAt',
    cell: ({ row }) => renderCreatedAtCell(row.original.createdAt),
  },
];
