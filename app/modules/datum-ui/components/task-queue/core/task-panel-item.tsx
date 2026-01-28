import type { Task } from '../types';
import { TaskPanelActions } from './task-panel-actions';
import { TaskPanelCounter } from './task-panel-counter';
import { Button } from '@datum-ui/components/button/button';
import { SpinnerIcon } from '@datum-ui/components/icons/spinner-icon';
import { X, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';

interface TaskPanelItemProps {
  task: Task;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function TaskPanelItem({ task, onCancel, onRetry, onDismiss }: TaskPanelItemProps) {
  const isDismissable =
    task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';

  return (
    <div className="border-border flex flex-col gap-1 border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex shrink-0 items-center">
          <TaskStatusIcon task={task} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{task.title}</span>

          {task.status === 'pending' && (
            <span className="text-muted-foreground text-xs">Waiting...</span>
          )}

          {task.status === 'running' && (
            <TaskPanelCounter total={task.total} completed={task.completed} failed={task.failed} />
          )}

          {(task.status === 'completed' ||
            task.status === 'failed' ||
            task.status === 'cancelled') && (
            <TaskPanelCounter total={task.total} completed={task.completed} failed={task.failed} />
          )}

          <TaskPanelActions task={task} onRetry={onRetry} />
        </div>

        <div className="flex shrink-0 items-center">
          {task.status === 'running' && task.cancelable && (
            <Button
              type="quaternary"
              theme="borderless"
              size="icon"
              className="size-6"
              onClick={onCancel}
              aria-label="Cancel task">
              <X className="size-3.5" />
            </Button>
          )}
          {isDismissable && (
            <Button
              type="quaternary"
              theme="borderless"
              size="icon"
              className="size-6"
              onClick={onDismiss}
              aria-label="Dismiss task">
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskStatusIcon({ task }: { task: Task }) {
  if (task.icon && (task.status === 'pending' || task.status === 'running')) {
    return <>{task.icon}</>;
  }

  switch (task.status) {
    case 'pending':
      return <Clock className="text-muted-foreground size-4" />;
    case 'running':
      return <SpinnerIcon size="sm" />;
    case 'completed':
      return <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />;
    case 'failed':
      return <XCircle className="text-destructive size-4" />;
    case 'cancelled':
      return <Ban className="text-muted-foreground size-4" />;
  }
}
