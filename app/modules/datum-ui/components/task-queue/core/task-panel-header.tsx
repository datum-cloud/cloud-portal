import type { Task } from '../types';
import { Button } from '@datum-ui/components/button/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TaskPanelHeaderProps {
  tasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onDismissAll: () => void;
}

export function TaskPanelHeader({ tasks, expanded, onToggle, onDismissAll }: TaskPanelHeaderProps) {
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const hasDismissable = tasks.some(
    (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  );

  const activeCount = runningCount + pendingCount;

  return (
    <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium"
        onClick={onToggle}>
        <span>Background Tasks</span>
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold">
            {activeCount}
          </span>
        )}
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>

      {expanded && hasDismissable && (
        <Button type="quaternary" theme="borderless" size="xs" onClick={onDismissAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
