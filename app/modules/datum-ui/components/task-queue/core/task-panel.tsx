import { useTaskQueue } from '../hooks';
import { TaskPanelHeader } from './task-panel-header';
import { TaskPanelItem } from './task-panel-item';
import { cn } from '@shadcn/lib/utils';
import { useState } from 'react';

export function TaskPanel() {
  const { tasks, cancel, retry, dismiss, dismissAll } = useTaskQueue();
  const [expanded, setExpanded] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div
      className={cn(
        'border-border bg-background fixed right-4 bottom-4 z-50 w-96 overflow-hidden rounded-lg border shadow-lg',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}>
      <TaskPanelHeader
        tasks={tasks}
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        onDismissAll={dismissAll}
      />

      {expanded && (
        <div className="max-h-80 overflow-y-auto">
          {tasks.map((task) => (
            <TaskPanelItem
              key={task.id}
              task={task}
              onCancel={() => cancel(task.id)}
              onRetry={() => retry(task.id)}
              onDismiss={() => dismiss(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
