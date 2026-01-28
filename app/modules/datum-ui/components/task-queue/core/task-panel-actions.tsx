import type { Task } from '../types';
import { Button, type ButtonProps } from '@datum-ui/components/button/button';

interface TaskPanelActionsProps {
  task: Task;
  onRetry?: () => void;
}

export function TaskPanelActions({ task, onRetry }: TaskPanelActionsProps) {
  const actions = resolveActions(task);
  const showRetry =
    task.retryable && (task.status === 'failed' || task.status === 'cancelled') && task._processor;

  if (!showRetry && actions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 pt-1">
      {showRetry && (
        <Button type="secondary" theme="outline" size="xs" onClick={onRetry}>
          Retry{task.failed > 0 && task.total ? ` (${task.failed})` : ''}
        </Button>
      )}
      {actions.map((action, i) => (
        <Button key={i} size="xs" type="secondary" theme="outline" {...action} />
      ))}
    </div>
  );
}

function resolveActions(task: Task): ButtonProps[] {
  if (!task.completionActions) return [];
  if (task.status !== 'completed' && task.status !== 'failed') return [];

  if (typeof task.completionActions === 'function') {
    return task.completionActions(task.result);
  }

  return task.completionActions;
}
