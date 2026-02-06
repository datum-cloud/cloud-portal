import type { Task } from '../types';
import { TaskPanelActions } from './task-panel-actions';
import { TaskPanelCounter } from './task-panel-counter';
import { Icon } from '@datum-ui/components';
import { SpinnerIcon } from '@datum-ui/components/icons/spinner-icon';
import { cn } from '@shadcn/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';
// RotateCcw commented out - will be used when retry is re-enabled
import {
  CheckCircle,
  XCircle,
  Ban,
  X /* RotateCcw, */,
  FileIcon,
  CircleAlert,
  CornerDownRightIcon,
} from 'lucide-react';

interface TaskPanelItemProps {
  task: Task;
  contextLabel?: string;
  onCancel: () => void;
  onDismiss: () => void;
  // TODO: Re-enable when processor registry is implemented
  // onRetry: () => void;
}

export function TaskPanelItem({ task, contextLabel, onCancel, onDismiss }: TaskPanelItemProps) {
  // TODO: Re-enable when processor registry is implemented
  // See FUTURE_ENHANCEMENTS.md
  // const canRetry = task.retryable && (task.status === 'failed' || task.status === 'cancelled');

  return (
    <div className="group border-border flex flex-col gap-1 border-t px-4 py-3">
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

          {task.status === 'running' && (
            <TaskPanelCounter total={task.total} completed={task.completed} failed={task.failed} />
          )}

          {(task.status === 'completed' ||
            task.status === 'failed' ||
            task.status === 'cancelled') && (
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

          <TaskPanelActions task={task} />
        </div>

        {/* Status/Action icon on the right - hover to reveal action */}
        <div className="flex shrink-0 items-center">
          <TaskStatusAction task={task} onCancel={onCancel} onDismiss={onDismiss} />
        </div>
      </div>
    </div>
  );
}

/** Left-side task icon - shows task icon when running, status icon when complete */
function TaskIcon({ task }: { task: Task }) {
  // Running or pending: show custom icon or default file icon
  if (task.status === 'running' || task.status === 'pending') {
    if (task.icon) {
      return <span className="text-muted-foreground [&>svg]:size-5">{task.icon}</span>;
    }
    return <Icon icon={FileIcon} className="text-muted-foreground size-5" />;
  }

  // Completed with some failures (partial success)
  if (task.status === 'completed' && task.failed > 0) {
    return <Icon icon={CircleAlert} className="size-5 text-amber-500" />;
  }

  // Completed successfully
  if (task.status === 'completed') {
    return <Icon icon={CheckCircle} className="size-5 text-green-600 dark:text-green-400" />;
  }

  // Failed
  if (task.status === 'failed') {
    return <Icon icon={XCircle} className="text-destructive size-5" />;
  }

  // Cancelled
  if (task.status === 'cancelled') {
    return <Icon icon={Ban} className="text-muted-foreground size-5" />;
  }

  // Fallback
  return <Icon icon={FileIcon} className="text-muted-foreground size-5" />;
}

/** Right-side status indicator with action */
function TaskStatusAction({
  task,
  onCancel,
  onDismiss,
}: {
  task: Task;
  onCancel: () => void;
  onDismiss: () => void;
  // TODO: Re-enable when processor registry is implemented
  // canRetry: boolean;
  // onRetry: () => void;
}) {
  const buttonClass = cn(
    'flex size-7 items-center justify-center rounded-md transition-colors',
    'text-muted-foreground hover:bg-accent hover:text-foreground'
  );

  // Running: Spinner → Cancel on hover (only state with hover effect)
  if (task.status === 'running') {
    return (
      <div className="relative size-7">
        {/* Default: Spinner */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
          <SpinnerIcon size="md" />
        </div>
        {/* Hover: Cancel button */}
        {task.cancelable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onCancel}
                className={cn(
                  buttonClass,
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
      <div className="flex size-7 items-center justify-center">
        <SpinnerIcon size="md" className="opacity-50" />
      </div>
    );
  }

  // Completed: Show dismiss button directly
  if (task.status === 'completed') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onDismiss}
            className={buttonClass}
            aria-label="Dismiss task">
            <Icon icon={X} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">Dismiss</TooltipContent>
      </Tooltip>
    );
  }

  // Failed: Show dismiss button
  // TODO: Retry button disabled - processor lost after page reload
  // See FUTURE_ENHANCEMENTS.md for processor registry pattern to enable retry
  if (task.status === 'failed') {
    // if (canRetry) {
    //   return (
    //     <Tooltip>
    //       <TooltipTrigger asChild>
    //         <button
    //           type="button"
    //           onClick={onRetry}
    //           className={buttonClass}
    //           aria-label="Retry task">
    //           <RotateCcw className="size-4" />
    //         </button>
    //       </TooltipTrigger>
    //       <TooltipContent side="left">Retry</TooltipContent>
    //     </Tooltip>
    //   );
    // }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onDismiss}
            className={buttonClass}
            aria-label="Dismiss task">
            <Icon icon={X} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">Dismiss</TooltipContent>
      </Tooltip>
    );
  }

  // Cancelled: Show dismiss button
  // TODO: Retry button disabled - processor lost after page reload
  // See FUTURE_ENHANCEMENTS.md for processor registry pattern to enable retry
  if (task.status === 'cancelled') {
    // if (canRetry) {
    //   return (
    //     <Tooltip>
    //       <TooltipTrigger asChild>
    //         <button
    //           type="button"
    //           onClick={onRetry}
    //           className={buttonClass}
    //           aria-label="Retry task">
    //           <RotateCcw className="size-4" />
    //         </button>
    //       </TooltipTrigger>
    //       <TooltipContent side="left">Retry</TooltipContent>
    //     </Tooltip>
    //   );
    // }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onDismiss}
            className={buttonClass}
            aria-label="Dismiss task">
            <Icon icon={X} className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">Dismiss</TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
