import { TaskQueueContext } from '../provider';
import type { Task, TaskQueueAPI, UseTaskQueueOptions } from '../types';
import { useContext, useMemo, useSyncExternalStore } from 'react';

// Cached empty array for server snapshot - MUST be the same reference to avoid infinite loop
const EMPTY_TASKS: Task[] = [];

export function useTaskQueue(options?: UseTaskQueueOptions): TaskQueueAPI {
  const context = useContext(TaskQueueContext);
  if (!context) {
    throw new Error('useTaskQueue must be used within a TaskQueueProvider');
  }

  const { queue } = context;

  // Use the bound methods directly - they're arrow functions on the class
  const allTasks = useSyncExternalStore(queue.subscribe, queue.getSnapshot, () => EMPTY_TASKS);

  const tasks = useMemo(() => {
    if (!options?.status) return allTasks;
    return allTasks.filter((t) => t.status === options.status);
  }, [allTasks, options?.status]);

  // Track activeSummary via useSyncExternalStore so it re-renders correctly
  // even if the task snapshot reference doesn't change.
  const activeSummary = useSyncExternalStore(queue.subscribe, queue.getActiveSummary, () => null);

  // queue is a stable reference from context, its methods are arrow functions bound to class instance
  // Only tasks and activeSummary change, so those are the only dependencies needed
  return useMemo(
    () => ({
      enqueue: queue.enqueue,
      cancel: queue.cancel,
      retry: queue.retry,
      dismiss: queue.dismiss,
      dismissAll: queue.dismissAll,
      showSummary: queue.showSummary,
      closeSummary: queue.closeSummary,
      activeSummary,
      tasks,
    }),
    [tasks, activeSummary]
  );
}
