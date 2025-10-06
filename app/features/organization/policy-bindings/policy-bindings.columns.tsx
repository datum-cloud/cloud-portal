import {
  renderCreatedAtCell,
  renderResourceCell,
  renderStatusCell,
  renderSubjectsCell,
} from './policy-bindings.helpers';
import { PolicyBindingColumn } from './policy-bindings.types';

export const getPolicyBindingColumns = (): PolicyBindingColumn[] => [
  {
    header: 'Resource Name',
    accessorKey: 'name',
    cell: ({ row }) => <span className="text-primary font-semibold">{row.original.name}</span>,
  },
  {
    header: 'Role',
    accessorKey: 'roleRef',
    cell: ({ row }) => row.original.roleRef?.name ?? '-',
  },
  {
    header: 'Resource',
    accessorKey: 'resourceSelector',
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
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => renderStatusCell(row.original.status),
  },
  {
    header: 'Created At',
    accessorKey: 'createdAt',
    cell: ({ row }) => renderCreatedAtCell(row.original.createdAt),
  },
];
