import { TaskQueueContext } from '../provider';
import type { TaskQueueAPI, UseTaskQueueOptions } from '../types';
import { useContext, useMemo, useSyncExternalStore } from 'react';

export function useTaskQueue(options?: UseTaskQueueOptions): TaskQueueAPI {
  const context = useContext(TaskQueueContext);
  if (!context) {
    throw new Error('useTaskQueue must be used within a TaskQueueProvider');
  }

  const { queue } = context;

  const allTasks = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);

  const tasks = useMemo(() => {
    if (!options?.status) return allTasks;
    return allTasks.filter((t) => t.status === options.status);
  }, [allTasks, options?.status]);

  return useMemo(
    () => ({
      enqueue: queue.enqueue,
      cancel: queue.cancel,
      retry: queue.retry,
      dismiss: queue.dismiss,
      dismissAll: queue.dismissAll,
      tasks,
    }),
    [queue, tasks]
  );
}
