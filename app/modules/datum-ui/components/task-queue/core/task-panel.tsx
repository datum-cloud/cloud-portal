import { useTaskQueue } from '../hooks';
import { TaskPanelHeader } from './task-panel-header';
import { TaskPanelItem } from './task-panel-item';
import { cn } from '@shadcn/lib/utils';
import { useState } from 'react';

export function TaskPanel() {
  // TODO: Re-enable retry when processor registry is implemented
  const { tasks, cancel, /* retry, */ dismiss, dismissAll } = useTaskQueue();
  const [expanded, setExpanded] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-background fixed right-4 bottom-4 z-50 w-96 overflow-hidden',
        'border-border/50 rounded-xl border shadow-xl shadow-black/10',
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
              onDismiss={() => dismiss(task.id)}
              // TODO: Re-enable when processor registry is implemented
              // onRetry={() => retry(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
