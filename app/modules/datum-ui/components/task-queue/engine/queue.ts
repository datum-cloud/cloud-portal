import { TASK_QUEUE_DEFAULTS } from '../constants';
import type {
  Task,
  TaskQueueConfig,
  TaskStorage,
  EnqueueOptions,
  TaskHandle,
  TaskOutcome,
} from '../types';
import { generateTaskId } from '../utils';
import { executeTask } from './executor';
import { LocalTaskStorage } from './storage';

export class TaskQueue {
  private storage: TaskStorage;
  private concurrency: number;
  private runningCount = 0;
  private listeners: Set<() => void> = new Set();
  private taskResolvers: Map<string, (outcome: TaskOutcome) => void> = new Map();
  private snapshot: Task[] = [];

  constructor(config: TaskQueueConfig = {}) {
    this.concurrency = config.concurrency ?? TASK_QUEUE_DEFAULTS.concurrency;
    this.storage = config.storage ?? new LocalTaskStorage(config.storageKey);
    this.updateSnapshot();
  }

  // --- useSyncExternalStore compatibility ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Task[] => {
    return this.snapshot;
  };

  private notify(): void {
    this.updateSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private updateSnapshot(): void {
    this.snapshot = this.storage.getAll();
  }

  // --- Public API ---

  enqueue = <TItem = unknown, TResult = unknown>(
    options: EnqueueOptions<TItem, TResult>
  ): TaskHandle<TResult> => {
    const id = generateTaskId();
    const items = options.items as unknown[] | undefined;

    const task: Task<TResult> = {
      id,
      title: options.title,
      status: 'pending',
      icon: options.icon,
      category: options.category,
      items,
      total: items?.length,
      completed: 0,
      failed: 0,
      failedItems: [],
      errorStrategy: options.errorStrategy ?? TASK_QUEUE_DEFAULTS.errorStrategy,
      cancelable: options.cancelable ?? TASK_QUEUE_DEFAULTS.cancelable,
      retryable: options.retryable ?? TASK_QUEUE_DEFAULTS.retryable,
      completionActions: options.completionActions as Task<TResult>['completionActions'],
      retryCount: 0,
      createdAt: Date.now(),
      _processor: options.processor as Task<TResult>['_processor'],
      _originalItems: items ? [...items] : undefined,
    };

    this.storage.set(id, task as Task);
    this.notify();

    const promise = new Promise<TaskOutcome<TResult>>((resolve) => {
      this.taskResolvers.set(id, resolve as (outcome: TaskOutcome) => void);
    });

    this.drain();

    return {
      id,
      cancel: () => this.cancel(id),
      promise,
    };
  };

  cancel = (taskId: string): void => {
    const task = this.storage.get(taskId);
    if (!task || task.status !== 'running') return;

    const setCancelled = (task as any)._setCancelled;
    if (typeof setCancelled === 'function') {
      setCancelled(true);
    }
  };

  retry = (taskId: string): void => {
    const task = this.storage.get(taskId);
    if (!task) return;
    if (task.status !== 'failed' && task.status !== 'cancelled') return;
    if (!task._processor) return;

    // Determine retry items: only failed items if batch, otherwise full re-run
    const retryItems =
      task._originalItems && task.failedItems.length > 0
        ? task._originalItems.filter((item) => {
            return task.failedItems.some((fi) => {
              if (!fi.id) return false;
              if (typeof item === 'string') return fi.id === item;
              if (typeof item === 'object' && item !== null) {
                return (item as any).id === fi.id || (item as any).name === fi.id;
              }
              return false;
            });
          })
        : task._originalItems;

    const retryCount = task.retryCount + 1;
    const titleSuffix = retryCount === 1 ? ' (retry)' : ` (retry ${retryCount})`;
    const baseTitle = task.title.replace(/ \(retry( \d+)?\)$/, '');

    // Dismiss the original task
    this.storage.remove(taskId);

    // Create new task
    const newId = generateTaskId();
    const newTask: Task = {
      id: newId,
      title: baseTitle + titleSuffix,
      status: 'pending',
      icon: task.icon,
      category: task.category,
      items: retryItems && retryItems.length > 0 ? retryItems : task._originalItems,
      total: retryItems && retryItems.length > 0 ? retryItems.length : task.total,
      completed: 0,
      failed: 0,
      failedItems: [],
      errorStrategy: task.errorStrategy,
      cancelable: task.cancelable,
      retryable: task.retryable,
      completionActions: task.completionActions,
      retryOf: taskId,
      retryCount,
      createdAt: Date.now(),
      _processor: task._processor,
      _originalItems: task._originalItems,
    };

    this.storage.set(newId, newTask);
    this.notify();
    this.drain();
  };

  dismiss = (taskId: string): void => {
    const task = this.storage.get(taskId);
    if (!task) return;
    if (task.status === 'running' || task.status === 'pending') return;
    this.storage.remove(taskId);
    this.notify();
  };

  dismissAll = (): void => {
    const tasks = this.storage.getAll();
    tasks.forEach((task) => {
      if (task.status !== 'running' && task.status !== 'pending') {
        this.storage.remove(task.id);
      }
    });
    this.notify();
  };

  // --- Internal scheduling ---

  private drain(): void {
    const tasks = this.storage.getAll();
    const pending = tasks.filter((t) => t.status === 'pending');

    while (this.runningCount < this.concurrency && pending.length > 0) {
      const next = pending.shift();
      if (!next) break;
      this.runTask(next);
    }
  }

  private async runTask(task: Task): Promise<void> {
    this.runningCount += 1;

    try {
      const outcome = await executeTask(task, {
        onUpdate: (updated) => {
          this.storage.set(updated.id, updated);
          this.notify();
        },
      });

      const resolver = this.taskResolvers.get(task.id);
      if (resolver) {
        resolver(outcome);
        this.taskResolvers.delete(task.id);
      }
    } finally {
      this.runningCount -= 1;
      this.drain();
    }
  }
}
