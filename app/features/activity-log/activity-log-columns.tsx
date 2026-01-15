import { DateTime } from '@/components/date-time';
import type { ActivityLog } from '@/resources/activity-logs';
import { User } from '@/resources/users';
import { Badge } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';

/**
 * Returns column definitions for the Activity Log table.
 *
 * Columns:
 * - User: Who performed the action (email or system account)
 * - Action: Humanized action with error badge if failed
 * - Details: Resource type and name
 * - Date: Relative timestamp with tooltip for absolute
 */
export function getActivityLogColumns(user?: User): ColumnDef<ActivityLog>[] {
  return [
    {
      id: 'user',
      header: 'User',
      accessorKey: 'user',
      cell: ({ row }) => {
        const { user: userName, userId } = row.original;
        return (
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground text-xs font-medium">{userName ?? '-'}</span>
            {user && userId === user?.sub && (
              <Badge
                type="quaternary"
                theme="outline"
                className="rounded-[8px] px-[7px] font-normal">
                You
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'action',
      header: 'Action',
      accessorKey: 'action',
      size: 180,
      cell: ({ row }) => <span className="text-xs font-medium">{row.original.action}</span>,
    },
    {
      id: 'details',
      header: 'Details',
      accessorKey: 'details',
      cell: ({ row }) => {
        const { details, resourceName } = row.original;
        return (
          <span className="text-xs" title={resourceName}>
            {details}
          </span>
        );
      },
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'timestamp',
      size: 150,
      cell: ({ row }) => {
        const { timestamp } = row.original;
        return <DateTime date={timestamp} className="text-xs" />;
      },
    },
  ];
}
