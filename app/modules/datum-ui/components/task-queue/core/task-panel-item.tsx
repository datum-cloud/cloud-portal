import type { Task } from '../types';
import { TaskPanelActions } from './task-panel-actions';
import { TaskPanelCounter } from './task-panel-counter';
import { Icon } from '@datum-ui/components';
import { SpinnerIcon } from '@datum-ui/components/icons/spinner-icon';
import { cn } from '@shadcn/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Ban,
  X,
  FileIcon,
  CircleAlert,
  CornerDownRightIcon,
} from 'lucide-react';

interface TaskPanelItemProps {
  task: Task;
  contextLabel?: string;
  onCancel: () => void;
}

export function TaskPanelItem({ task, contextLabel, onCancel }: TaskPanelItemProps) {
  const hasBatch = task.total != null;
  const isTerminal =
    task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';

  return (
    <div className="group border-border flex flex-col gap-1 px-4 py-3 not-first:border-t">
      <div className="flex items-start gap-3">
        {/* Task icon on the left */}
        <div className="mt-0.5 flex shrink-0 items-center">
          <TaskIcon task={task} />
        </div>

        {/* Title and progress */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{task.title}</span>

          {task.status === 'pending' && (
            <span className="text-muted-foreground text-xs">Waiting...</span>
          )}

          {/* Only show counter for batch tasks */}
          {hasBatch && task.status === 'running' && (
            <TaskPanelCounter total={task.total} completed={task.completed} failed={task.failed} />
          )}

          {hasBatch && isTerminal && (
            <TaskPanelCounter
              total={task.total}
              completed={task.completed}
              failed={task.failed}
              status={task.status}
            />
          )}

          {contextLabel && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Icon icon={CornerDownRightIcon} className="size-3 shrink-0 opacity-60" />
              <span className="truncate">{contextLabel}</span>
            </span>
          )}
        </div>

        {/* Right side: action for running/pending, timestamp for terminal */}
        <div className="flex shrink-0 items-center">
          <TaskStatusAction task={task} onCancel={onCancel} />
        </div>
      </div>
      <TaskPanelActions task={task} />
    </div>
  );
}

/** Left-side task icon - shows task icon when running, status icon when complete */
function TaskIcon({ task }: { task: Task }) {
  // Running or pending: show custom icon or default file icon
  if (task.status === 'running' || task.status === 'pending') {
    if (task.icon) {
      return <span className="text-muted-foreground [&>svg]:size-4">{task.icon}</span>;
    }
    return <Icon icon={FileIcon} className="text-muted-foreground size-4" />;
  }

  // Completed with some failures (partial success)
  if (task.status === 'completed' && task.failed > 0) {
    return <Icon icon={CircleAlert} className="size-4 text-amber-500" />;
  }

  // Completed successfully
  if (task.status === 'completed') {
    return <Icon icon={CheckCircle} className="size-4 text-green-600 dark:text-green-400" />;
  }

  // Failed
  if (task.status === 'failed') {
    return <Icon icon={XCircle} className="text-destructive size-4" />;
  }

  // Cancelled
  if (task.status === 'cancelled') {
    return <Icon icon={Ban} className="text-muted-foreground size-4" />;
  }

  // Fallback
  return <Icon icon={FileIcon} className="text-muted-foreground size-4" />;
}

/** Format completedAt timestamp as human-readable relative time */
function formatCompletedAt(completedAt?: number): string {
  if (!completedAt) return '';
  const elapsedMs = Date.now() - completedAt;
  if (elapsedMs < 1000) return 'just now';
  const distance = formatDistanceToNowStrict(new Date(completedAt), { addSuffix: false });
  return `${distance} ago`;
}

/** Right-side: spinner/cancel for active tasks, timestamp for terminal tasks */
function TaskStatusAction({ task, onCancel }: { task: Task; onCancel: () => void }) {
  // Running: Spinner → Cancel on hover
  if (task.status === 'running') {
    return (
      <div className="relative size-5">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
          <SpinnerIcon size="sm" />
        </div>
        {task.cancelable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onCancel}
                className={cn(
                  'flex size-5 items-center justify-center rounded-md transition-colors',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100'
                )}
                aria-label="Cancel task">
                <Icon icon={X} className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Cancel</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  // Pending: Show spinner (waiting to start)
  if (task.status === 'pending') {
    return (
      <div className="flex size-5 items-center justify-center">
        <SpinnerIcon size="sm" className="opacity-50" />
      </div>
    );
  }

  // Terminal states: show completedAt timestamp
  return (
    <span className="text-muted-foreground/60 text-xs whitespace-nowrap">
      {formatCompletedAt(task.completedAt)}
    </span>
  );
}
