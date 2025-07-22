import { Badge } from '@/components/ui/badge';
import type { ActivityLogEntry } from '@/modules/loki/types';
import { cn } from '@/utils/misc';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

interface ActivityLogItemProps {
  log: ActivityLogEntry;
  index: number;
}

export const ActivityLogItem = ({ log, index }: ActivityLogItemProps) => {
  return (
    <div
      key={`${log.auditId}-${log.timestamp}-${index}`}
      className="flex w-full items-center justify-between gap-4">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start gap-1">
          {/* Icon based on category/status */}
          <div className="relative top-[4px]">
            {log.category === 'success' && (
              <CheckCircle size={14} className="flex-shrink-0 text-green-600" />
            )}
            {log.category === 'error' && (
              <XCircle size={14} className="flex-shrink-0 text-red-600" />
            )}
            {log.category === 'warning' && (
              <AlertTriangle size={14} className="flex-shrink-0 text-amber-600" />
            )}
            {log.category === 'info' && <Info size={14} className="flex-shrink-0 text-blue-600" />}
            {!log.category && <Info size={14} className="flex-shrink-0 text-gray-600" />}
          </div>

          <div className="flex-1">
            {log.formattedMessage ? (
              <div className="text-sm" dangerouslySetInnerHTML={{ __html: log.formattedMessage }} />
            ) : (
              <p className="text-sm">{log.message}</p>
            )}
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          <span>{formatDistanceToNowStrict(new Date(log.timestamp), { addSuffix: true })}</span>
          {(log.sourceIPs ?? []).length > 0 && <span>Source: {log.sourceIPs?.join(', ')}</span>}
        </div>
      </div>

      {/* Status badge with relevant colors */}
      {(log.statusMessage || log.category) && (
        <Badge
          variant="outline"
          className={cn(
            'w-fit capitalize',
            log.category === 'success' && 'border-green-200 bg-green-50 text-green-600',
            log.category === 'info' && 'border-blue-200 bg-blue-50 text-blue-600',
            log.category === 'warning' && 'border-yellow-200 bg-yellow-50 text-yellow-600',
            log.category === 'error' && 'border-red-200 bg-red-50 text-red-600'
          )}>
          {log.statusMessage || log.category}
        </Badge>
      )}
    </div>
  );
};
