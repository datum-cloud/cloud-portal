import type { Task } from '../types';
import { Button, type ButtonProps } from '@datum-ui/components/button/button';

interface TaskPanelActionsProps {
  task: Task;
}

export function TaskPanelActions({ task }: TaskPanelActionsProps) {
  const actions = resolveActions(task);

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 pt-1.5">
      {actions.map((action, i) => (
        <Button key={i} {...action} />
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
