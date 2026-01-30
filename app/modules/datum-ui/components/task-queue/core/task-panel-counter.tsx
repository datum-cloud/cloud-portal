import type { TaskStatus } from '../types';
import { cn } from '@shadcn/lib/utils';

interface TaskPanelCounterProps {
  total?: number;
  completed: number;
  failed: number;
  status?: TaskStatus;
}

export function TaskPanelCounter({ total, completed, failed, status }: TaskPanelCounterProps) {
  const parts: string[] = [];

  // Show different text based on status
  if (status === 'completed' && failed === 0) {
    if (total != null) {
      parts.push(`${total}/${total} completed`);
    } else {
      parts.push('Completed');
    }
  } else if (status === 'cancelled') {
    parts.push('Cancelled');
    if (completed > 0) {
      parts.push(`${completed} completed`);
    }
  } else {
    if (total != null) {
      parts.push(`${completed}/${total} completed`);
    } else if (completed > 0) {
      parts.push(`${completed} completed`);
    }
  }

  if (failed > 0) {
    parts.push(`${failed} failed`);
  }

  if (parts.length === 0) return null;

  return (
    <span className="text-muted-foreground text-xs">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <span className={cn(part.includes('failed') && 'text-destructive')}>{part}</span>
        </span>
      ))}
    </span>
  );
}
