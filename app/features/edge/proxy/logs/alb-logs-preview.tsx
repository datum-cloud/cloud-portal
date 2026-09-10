import { Logs, type LogColumnId, type LogEntry } from '@datum-cloud/datum-ui/logs';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

const PREVIEW_COLUMNS: readonly LogColumnId[] = ['time', 'status', 'path'];

export interface AlbLogsPreviewProps {
  entries: readonly LogEntry[];
  isLoading?: boolean;
  error?: ReactNode;
  className?: string;
}

/** Compact table for the ALB overview card — no filter sidebar or live toggle. */
export function AlbLogsPreview({ entries, isLoading, error, className }: AlbLogsPreviewProps) {
  return (
    <Logs.Root
      entries={entries}
      isLoading={isLoading}
      error={error}
      columns={PREVIEW_COLUMNS}
      className={cn('min-h-0 flex-1', className)}>
      <Logs.Table className="rounded-t-lg [&_th:first-child]:rounded-tl-lg [&_th:last-child]:rounded-tr-lg" />
    </Logs.Root>
  );
}
