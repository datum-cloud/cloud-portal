import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import type { ActivityLogEntry } from '@/modules/loki/types';
import { cn } from '@/utils/misc';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import {
  User,
  Database,
  AlertCircle,
  CheckCircle,
  Dot,
  Search,
  Eye,
  Plus,
  Trash,
  Edit,
  FileText,
} from 'lucide-react';
import { useMemo } from 'react';

interface ActivityLogListProps {
  logs?: ActivityLogEntry[];
}

export const ActivityLogList = ({ logs = [] }: ActivityLogListProps) => {
  const columns: ColumnDef<ActivityLogEntry>[] = useMemo(
    () => [
      {
        header: 'Recent events',
        accessorKey: 'auditId',
        meta: {
          className: 'whitespace-normal',
        },
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div
              key={`${log.auditId}-${log.timestamp}-${row.index}`}
              className="flex w-full flex-col gap-2">
              <div className="flex items-center">
                <Badge
                  className={cn(
                    'flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium',
                    log.verb === 'list' && 'border-blue-200 bg-blue-50 text-blue-700',
                    log.verb === 'get' && 'border-purple-200 bg-purple-50 text-purple-700',
                    log.verb === 'create' && 'border-green-200 bg-green-50 text-green-700',
                    log.verb === 'update' && 'border-amber-200 bg-amber-50 text-amber-700',
                    log.verb === 'delete' && 'border-red-200 bg-red-50 text-red-700',
                    (!log.verb ||
                      !['list', 'get', 'create', 'update', 'delete'].includes(log.verb)) &&
                      'border-gray-200 bg-gray-50 text-gray-700'
                  )}
                  variant="outline">
                  {log.verb === 'list' && <Search className="stroke-blue-600" size={12} />}
                  {log.verb === 'get' && <Eye className="stroke-purple-600" size={12} />}
                  {log.verb === 'create' && <Plus className="stroke-green-600" size={12} />}
                  {log.verb === 'update' && <Edit className="stroke-amber-600" size={12} />}
                  {log.verb === 'delete' && <Trash className="stroke-red-600" size={12} />}
                  {(!log.verb ||
                    !['list', 'get', 'create', 'update', 'delete'].includes(log.verb)) && (
                    <FileText className="stroke-gray-600" size={12} />
                  )}
                  <span className="capitalize">{log.verb || 'Event'}</span>
                </Badge>
                <Dot size={14} />
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
              </div>
              {log.formattedMessage ? (
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: log.formattedMessage }}
                />
              ) : (
                <p className="text-sm">{log.message}</p>
              )}

              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                {log.user && (
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    <span>{log.user.username}</span>
                  </span>
                )}
                {log.resource && (
                  <span className="flex items-center gap-1 capitalize">
                    <Database size={12} />
                    <span>{log.resource.resource}</span>
                  </span>
                )}
                {log.statusMessage && (
                  <span
                    className={cn(
                      'flex items-center gap-1 capitalize',
                      log.statusMessage.startsWith('2') ? 'text-green-600' : ''
                    )}>
                    {log.statusMessage.startsWith('2') ? (
                      <CheckCircle size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    <span>{log.statusMessage}</span>
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
    ],
    []
  );
  return (
    <DataTable
      columns={columns}
      data={logs ?? []}
      emptyContent={{
        title: 'No activity logs found.',
      }}
      tableTitle={{
        title: 'Activity Logs',
      }}
      tableClassName="table-fixed"
    />
  );
};
