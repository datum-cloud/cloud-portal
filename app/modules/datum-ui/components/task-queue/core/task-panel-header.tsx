import type { Task } from '../types';
import { SpinnerIcon } from '@datum-ui/components/icons/spinner-icon';
import { cn } from '@shadcn/lib/utils';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface TaskPanelHeaderProps {
  tasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onDismissAll: () => void;
}

export function TaskPanelHeader({ tasks, expanded, onToggle, onDismissAll }: TaskPanelHeaderProps) {
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;
  const hasDismissable = tasks.some(
    (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  );

  const activeCount = runningCount + pendingCount;
  const isAllComplete = activeCount === 0 && tasks.length > 0;
  const hasRunning = runningCount > 0;

  // Dynamic title based on state
  const getTitle = () => {
    if (failedCount > 0 && activeCount === 0) {
      return `${failedCount} of ${tasks.length} failed`;
    }
    if (isAllComplete) {
      return 'All tasks complete';
    }
    if (runningCount > 0) {
      return `${runningCount} task${runningCount > 1 ? 's' : ''} running`;
    }
    if (pendingCount > 0) {
      return `${pendingCount} task${pendingCount > 1 ? 's' : ''} waiting`;
    }
    return `${tasks.length} task${tasks.length > 1 ? 's' : ''}`;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Spinner indicator when collapsed and tasks are running */}
        {!expanded && hasRunning && <SpinnerIcon size="sm" />}

        <span className="text-sm font-medium">{getTitle()}</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Collapse/expand toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex size-7 items-center justify-center rounded-md transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>

        {/* Dismiss all / close */}
        {hasDismissable && (
          <button
            type="button"
            onClick={onDismissAll}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            aria-label="Dismiss all">
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
