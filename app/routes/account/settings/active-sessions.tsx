import { Badge, DataTable, Icon } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';

const DUMMIES = [
  {
    id: 1,
    device: 'Macbook Pro - macOS',
    location: 'US',
    lastUsed: 'December 14, 2025 at 5:51pm, last seen 1 second ago',
  },
  {
    id: 2,
    device: 'iPhone - iOS',
    location: 'US',
    lastUsed: 'December 14, 2025 at 5:51pm, last seen 1 second ago',
  },
];
export default function AccountActiveSessionsPage() {
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        header: 'Device',
        accessorKey: 'device',
        id: 'device',
        size: 120,
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground text-xs font-medium">{row.original.device}</span>
              <Badge
                type="quaternary"
                theme="outline"
                className="rounded-[8px] px-[7px] font-normal">
                Current session
              </Badge>
            </div>
          );
        },
      },
      {
        header: 'Location',
        accessorKey: 'location',
        id: 'location',
        size: 80,
        cell: ({ row }) => {
          return <span className="text-foreground text-xs">{row.original.location}</span>;
        },
      },
      {
        header: 'Last Used',
        accessorKey: 'lastUsed',
        id: 'lastUsed',
        cell: ({ row }) => {
          return <span className="text-foreground text-xs">{row.original.lastUsed}</span>;
        },
      },
    ],
    []
  );
  return (
    <DataTable
      columns={columns}
      data={DUMMIES ?? []}
      emptyContent={{ title: 'No active sessions found.' }}
      rowActions={[
        {
          key: 'revoke',
          label: 'Revoke',
          icon: <Icon icon={Trash2Icon} className="size-3.5" />,
          display: 'inline',
          showLabel: false,
          className: 'w-6 h-6 px-0',
          action: () => {
            console.log('Revoke');
          },
        },
      ]}
    />
  );
}
