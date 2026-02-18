import { DateTime } from '@/components/date-time';
import type { ActivityLog } from '@/resources/activity-logs';
import { User } from '@/resources/users';
import { Badge } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';

export interface ActivityLogColumnsOptions {
  /** Current user for "You" badge display */
  user?: User;
  /** Hide the User column (useful for account/user scope where it's always the same user) */
  hideUserColumn?: boolean;
}

/**
 * Returns column definitions for the Activity Log table.
 *
 * Columns:
 * - User: Who performed the action (email or system account) - can be hidden
 * - Action: Humanized action with error badge if failed
 * - Details: Resource type and name
 * - Date: Relative timestamp with tooltip for absolute
 */
export function getActivityLogColumns(
  options: ActivityLogColumnsOptions = {}
): ColumnDef<ActivityLog>[] {
  const { user, hideUserColumn = false } = options;

  const columns: ColumnDef<ActivityLog>[] = [];

  // User column (optional)
  if (!hideUserColumn) {
    columns.push({
      id: 'user',
      header: 'User',
      accessorKey: 'user',
      cell: ({ row }) => {
        const { user: userName, userId } = row.original;
        return (
          <div className="flex items-center justify-between gap-2" data-e2e="activity-card">
            <span className="text-foreground text-xs font-medium" data-e2e="activity-user">
              {userName ?? '-'}
            </span>
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
    });
  }

  // Action column
  columns.push({
    id: 'action',
    header: 'Action',
    accessorKey: 'action',
    size: 180,
    cell: ({ row }) => {
      // If user column is hidden, add activity-card to action column (first column)
      if (hideUserColumn) {
        return (
          <div data-e2e="activity-card">
            <span className="text-xs font-medium" data-e2e="activity-action">
              {row.original.action}
            </span>
          </div>
        );
      }
      return (
        <span className="text-xs font-medium" data-e2e="activity-action">
          {row.original.action}
        </span>
      );
    },
  });

  // Details/Target column
  columns.push({
    id: 'details',
    header: 'Target',
    accessorKey: 'details',
    cell: ({ row }) => {
      const { details, resourceName } = row.original;
      return (
        <span className="text-xs" title={resourceName} data-e2e="activity-target">
          {details}
        </span>
      );
    },
  });

  // Date column
  columns.push({
    id: 'date',
    header: 'Date',
    accessorKey: 'timestamp',
    size: 150,
    cell: ({ row }) => {
      const { timestamp } = row.original;
      return (
        <span data-e2e="activity-date">
          <DateTime date={timestamp} className="text-xs" />
        </span>
      );
    },
  });

  return columns;
}
