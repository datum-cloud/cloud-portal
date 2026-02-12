// Context labels are always shown because the dropdown is global (visible from any page).
// This is intentional — unlike the old TaskPanel which used useTasksWithLabels() to hide
// labels when all tasks matched the current scope.
import { useTaskQueue, getContextLabel } from '../hooks';
import { TaskPanelHeader } from './task-panel-header';
import { TaskPanelItem } from './task-panel-item';
import { TaskQueueTrigger } from './task-queue-trigger';
import { TaskSummaryDialog } from './task-summary-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/modules/datum-ui/components/dropdown';
import { useEffect, useState } from 'react';

// Track task IDs that have already triggered an auto-open.
// Module-level so it survives component remounts during navigation
// (e.g. navigating between route groups remounts DashboardLayout → Header → TaskQueueDropdown).
// Pruned automatically when tasks are dismissed.
const autoOpenedForIds = new Set<string>();

export function TaskQueueDropdown() {
  const { tasks, cancel, dismissAll, activeSummary, closeSummary } = useTaskQueue();

  // Auto-open only for genuinely new tasks (IDs not yet seen).
  const [open, setOpen] = useState(() => tasks.some((t) => !autoOpenedForIds.has(t.id)));

  // When new tasks arrive while mounted, open the dropdown and mark them as seen.
  useEffect(() => {
    if (tasks.some((t) => !autoOpenedForIds.has(t.id))) {
      setOpen(true);
    }
    for (const t of tasks) autoOpenedForIds.add(t.id);

    // Prune IDs of dismissed tasks so the set doesn't grow unbounded
    if (autoOpenedForIds.size > tasks.length) {
      const currentIds = new Set(tasks.map((t) => t.id));
      for (const id of autoOpenedForIds) {
        if (!currentIds.has(id)) autoOpenedForIds.delete(id);
      }
    }
  }, [tasks]);

  // If there are any tasks that are not running or pending, show the dismiss button.
  const hasDismissable = tasks.some((t) => t.status !== 'running' && t.status !== 'pending');

  if (tasks.length === 0) return null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <TaskQueueTrigger tasks={tasks} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-96 p-0">
          <TaskPanelHeader />
          <div className="max-h-[350px] overflow-y-auto">
            {tasks.map((task) => (
              <TaskPanelItem
                key={task.id}
                task={task}
                contextLabel={getContextLabel(task.metadata)}
                onCancel={() => cancel(task.id)}
              />
            ))}
          </div>
          {hasDismissable && (
            <button
              type="button"
              onClick={() => {
                dismissAll();
              }}
              className="border-border hover:bg-accent flex w-full cursor-pointer items-center justify-center gap-2 border-t px-3 py-2 transition-colors">
              <span className="text-destructive text-xs">Clear tasks</span>
            </button>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeSummary && (
        <TaskSummaryDialog
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) closeSummary();
          }}
          title={activeSummary.title}
          items={activeSummary.items}
        />
      )}
    </>
  );
}
