import type { Task } from '../types';
import { extractItemId } from '../utils';
import { Button, type ButtonProps } from '@datum-ui/components/button/button';

interface TaskPanelActionsProps {
  task: Task;
}

export function TaskPanelActions({ task }: TaskPanelActionsProps) {
  const actions = resolveActions(task);

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {actions.map((action, i) => (
        <Button htmlType="button" key={i} {...action} />
      ))}
    </div>
  );
}

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'] as const;

function resolveActions(task: Task): ButtonProps[] {
  if (!task.completionActions) return [];
  if (!TERMINAL_STATUSES.includes(task.status as (typeof TERMINAL_STATUSES)[number])) return [];

  if (typeof task.completionActions === 'function') {
    const originalItems = task._originalItems ?? task.items ?? [];
    const failedMap = new Map(task.failedItems.filter((f) => f.id).map((f) => [f.id, f]));
    const succeededSet = new Set(task.succeededItems);

    const items = originalItems
      .map((item) => {
        const id = extractItemId(item);
        if (!id) return null;
        const failed = failedMap.get(id);
        if (failed) return { id, status: 'failed' as const, message: failed.message, data: item };
        if (succeededSet.has(id)) return { id, status: 'succeeded' as const, data: item };
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return task.completionActions(task.result, {
      status: task.status,
      completed: task.completed,
      failed: task.failed,
      items,
    });
  }

  return task.completionActions;
}
