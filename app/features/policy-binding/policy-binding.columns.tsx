import {
  renderCreatedAtCell,
  renderResourceCell,
  renderSubjectsCell,
} from './policy-binding.helpers';
import { PolicyBindingColumn } from './policy-binding.types';

export const getPolicyBindingColumns = (): PolicyBindingColumn[] => [
  {
    header: 'Resource Name',
    accessorKey: 'name',
    meta: {
      className: 'max-w-[250px]',
    },
    cell: ({ row }) => (
      <span className="text-primary font-semibold break-words whitespace-normal">
        {row.original.name}
      </span>
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
