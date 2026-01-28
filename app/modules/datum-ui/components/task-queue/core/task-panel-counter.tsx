import { cn } from '@shadcn/lib/utils';

interface TaskPanelCounterProps {
  total?: number;
  completed: number;
  failed: number;
}

export function TaskPanelCounter({ total, completed, failed }: TaskPanelCounterProps) {
  const parts: string[] = [];

  if (total != null) {
    parts.push(`${completed}/${total} completed`);
  } else if (completed > 0) {
    parts.push(`${completed} completed`);
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
