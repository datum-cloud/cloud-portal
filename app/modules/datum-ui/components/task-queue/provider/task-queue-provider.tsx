import { TaskQueue } from '../engine';
import type { TaskQueueConfig } from '../types';
import { createContext, useMemo, useRef, type ReactNode } from 'react';

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

  const value = useMemo<TaskQueueContextValue>(() => ({ queue: queueRef.current! }), []);

  return <TaskQueueContext.Provider value={value}>{children}</TaskQueueContext.Provider>;
}
