import type { TaskStatus } from '../types';
import { cn } from '@shadcn/lib/utils';

interface TaskPanelCounterProps {
  total?: number;
  completed: number;
  failed?: number;
  status?: TaskStatus;
}

export function TaskPanelCounter({ total, completed, failed = 0, status }: TaskPanelCounterProps) {
  const hasBatch = total != null;

  // Single-item tasks: "Completed" | "Failed" | "Cancelled"
  // Batch running:     "3/10" or "3/10, 1 failed"
  // Batch terminal:    "Completed" | "3 completed, 1 failed" | "Cancelled, 3 completed"
  const parts: Array<{ text: string; destructive?: boolean }> = [];

  if (status === 'completed') {
    parts.push({ text: 'Completed' });
  } else if (status === 'failed') {
    if (hasBatch) {
      if (completed > 0) parts.push({ text: `${completed} completed` });
      parts.push({ text: `${failed} failed`, destructive: true });
    } else {
      parts.push({ text: 'Failed', destructive: true });
    }
  } else if (status === 'cancelled') {
    parts.push({ text: 'Cancelled' });
    if (hasBatch && completed > 0) parts.push({ text: `${completed} completed` });
  } else if (hasBatch) {
    parts.push({ text: `${completed + failed}/${total}` });
    if (failed > 0) parts.push({ text: `${failed} failed`, destructive: true });
  }

  if (parts.length === 0) return null;

  return (
    <span className="text-muted-foreground text-xs">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <span className={cn(part.destructive && 'text-destructive')}>{part.text}</span>
        </span>
      ))}
    </span>
  );
}
