import { TaskQueue } from '../engine';
import type { TaskQueueConfig } from '../types';
import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

export interface TaskQueueContextValue {
  queue: TaskQueue;
}

export const TaskQueueContext = createContext<TaskQueueContextValue | null>(null);

interface TaskQueueProviderProps {
  children: ReactNode;
  config?: TaskQueueConfig;
}

export function TaskQueueProvider({ children, config }: TaskQueueProviderProps) {
  const queueRef = useRef<TaskQueue | null>(null);

  if (!queueRef.current) {
    queueRef.current = new TaskQueue(config);
  }

  // Cleanup on unmount: cancel running tasks to prevent memory leaks
  useEffect(() => {
    const queue = queueRef.current;
    return () => {
      if (!queue) return;
      const tasks = queue.getSnapshot();
      tasks.forEach((task) => {
        if (task.status === 'running') {
          queue.cancel(task.id);
        }
      });
    };
  }, []);

  // Warn user before leaving if there are active tasks that require confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const tasks = queueRef.current?.getSnapshot() ?? [];

      // Show confirmation if ANY task is active AND requires confirmation
      // Default confirmBeforeUnload is true, so we respect per-task settings
      const shouldConfirm = tasks.some(
        (t) => (t.status === 'running' || t.status === 'pending') && t.confirmBeforeUnload !== false // Explicitly check for false (default is true)
      );

      if (shouldConfirm) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but this triggers the dialog
        e.returnValue = 'Tasks in progress will be lost.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const value = useMemo<TaskQueueContextValue>(() => ({ queue: queueRef.current! }), []);

  return <TaskQueueContext.Provider value={value}>{children}</TaskQueueContext.Provider>;
}
