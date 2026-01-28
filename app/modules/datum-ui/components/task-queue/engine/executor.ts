import type { Task, TaskContext, TaskOutcome } from '../types';

export interface ExecutorCallbacks {
  onUpdate: (task: Task) => void;
}

export function createTaskContext<TItem = unknown, TResult = unknown>(
  task: Task<TResult>,
  callbacks: ExecutorCallbacks
): {
  ctx: TaskContext<TItem, TResult>;
  getCancelled: () => boolean;
  setCancelled: (v: boolean) => void;
} {
  let cancelled = false;

  const ctx: TaskContext<TItem, TResult> = {
    get items() {
      return (task.items ?? []) as TItem[];
    },
    get cancelled() {
      return cancelled;
    },
    get failedItems() {
      return [...task.failedItems];
    },
    succeed() {
      task.completed += 1;
      callbacks.onUpdate({ ...task } as Task);
    },
    fail(itemId?: string, message?: string) {
      task.failed += 1;
      if (itemId || message) {
        task.failedItems.push({ id: itemId, message: message ?? 'Unknown error' });
      }
      callbacks.onUpdate({ ...task } as Task);
    },
    setTitle(title: string) {
      task.title = title;
      callbacks.onUpdate({ ...task } as Task);
    },
    setResult(result: TResult) {
      task.result = result;
    },
  };

  return {
    ctx,
    getCancelled: () => cancelled,
    setCancelled: (v: boolean) => {
      cancelled = v;
    },
  };
}

export async function executeTask<TResult = unknown>(
  task: Task<TResult>,
  callbacks: ExecutorCallbacks
): Promise<TaskOutcome<TResult>> {
  const processor = task._processor;
  if (!processor) {
    return {
      status: 'failed',
      completed: 0,
      failed: 0,
      failedItems: [{ message: 'No processor attached' }],
    };
  }

  task.status = 'running';
  task.startedAt = Date.now();
  callbacks.onUpdate({ ...task } as Task);

  const { ctx, getCancelled, setCancelled } = createTaskContext(task, callbacks);

  // Expose setCancelled so the queue can trigger cancellation
  (task as any)._setCancelled = setCancelled;

  try {
    await processor(ctx);

    if (getCancelled()) {
      task.status = 'cancelled';
    } else if (task.failed > 0) {
      task.status = 'failed';
    } else {
      task.status = 'completed';
    }
  } catch (error) {
    task.status = 'failed';
    const message = error instanceof Error ? error.message : 'Unknown error';
    task.failedItems.push({ message });
    task.failed += 1;
  }

  task.completedAt = Date.now();
  callbacks.onUpdate({ ...task } as Task);

  return {
    status: task.status as 'completed' | 'failed' | 'cancelled',
    completed: task.completed,
    failed: task.failed,
    failedItems: [...task.failedItems],
    result: task.result,
  };
}
