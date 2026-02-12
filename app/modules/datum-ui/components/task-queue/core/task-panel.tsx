import { useTaskQueue, getContextLabel } from '../hooks';
import { TaskPanelHeader } from './task-panel-header';
import { TaskPanelItem } from './task-panel-item';
import { cn } from '@shadcn/lib/utils';

/**
 * @deprecated Use TaskQueueDropdown instead — renders as a header-anchored dropdown.
 * TaskPanel is kept for backward compatibility but is no longer used in the main layout.
 */
export function TaskPanel() {
  const { tasks, cancel } = useTaskQueue();

  if (tasks.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-background fixed right-4 bottom-4 z-50 w-96 overflow-hidden',
        'border-border/50 rounded-xl border shadow-xl shadow-black/10',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}>
      <TaskPanelHeader />

      <div className="max-h-80 overflow-y-auto">
        {tasks.map((task) => (
          <TaskPanelItem
            key={task.id}
            task={task}
            contextLabel={getContextLabel(task.metadata)}
            onCancel={() => cancel(task.id)}
          />
        ))}
      </div>
    </div>
  );
}
