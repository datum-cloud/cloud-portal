import { TASK_QUEUE_DEFAULTS } from '../constants';
import type {
  Task,
  TaskQueueConfig,
  TaskStorage,
  EnqueueOptions,
  TaskHandle,
  TaskOutcome,
  TaskContext,
  ItemContext,
  ProcessItemEnqueueOptions,
  TaskSummaryItem,
  TaskSummaryData,
} from '../types';
import { generateTaskId, extractItemId } from '../utils';
import { executeTask } from './executor';
import { detectStorage } from './storage';

export class TaskQueue {
  private storage: TaskStorage;
  private concurrency: number;
  private runningCount = 0;
  private listeners: Set<() => void> = new Set();
  private taskResolvers: Map<string, (outcome: TaskOutcome) => void> = new Map();
  private snapshot: Task[] = [];
  private notifyScheduled = false;
  // Keep processors in memory (can't be serialized to storage)
  private processors: Map<string, Task['_processor']> = new Map();
  // Keep cancel functions in memory for running tasks
  private cancelFunctions: Map<string, (v: boolean) => void> = new Map();
  // Keep onComplete callbacks in memory
  private onCompleteCallbacks: Map<string, (outcome: TaskOutcome) => void | Promise<void>> =
    new Map();
  // Keep timeout timers in memory
  private taskTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Summary dialog state (survives navigation because the queue is a singleton)
  private _activeSummary: TaskSummaryData | null = null;

  constructor(config: TaskQueueConfig = {}) {
    this.concurrency = config.concurrency ?? TASK_QUEUE_DEFAULTS.concurrency;
    this.storage =
      config.storage ??
      detectStorage({
        redisClient: config.redisClient,
        storageKey: config.storageKey,
        storageType: config.storageType,
      });
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
    // Batch notifications using microtask to avoid flooding React with sync updates
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;

    queueMicrotask(() => {
      this.notifyScheduled = false;
      this.updateSnapshot();
      this.listeners.forEach((listener) => listener());
    });
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

    // Determine processor: use provided processor or build from processItem
    let processor: Task['_processor'];
    if ('processItem' in options && options.processItem) {
      processor = this.buildProcessor(
        options as ProcessItemEnqueueOptions<TItem, TResult>
      ) as Task['_processor'];
    } else if ('processor' in options && options.processor) {
      processor = options.processor as Task['_processor'];
    } else {
      throw new Error('[TaskQueue] enqueue: must provide either processor or processItem');
    }

    const cancelable = options.cancelable ?? TASK_QUEUE_DEFAULTS.cancelable;
    const confirmBeforeUnload = options.confirmBeforeUnload ?? true;

    // Development warning: non-cancelable tasks should confirm before unload
    if (process.env.NODE_ENV === 'development') {
      if (!cancelable && confirmBeforeUnload === false) {
        console.warn(
          `[TaskQueue] Task "${options.title}" is not cancelable but has confirmBeforeUnload: false. ` +
            `This may lead to data loss if the user closes the page. ` +
            `Consider setting confirmBeforeUnload: true (default).`
        );
      }
    }

    const task: Task<TResult> = {
      id,
      title: options.title,
      status: 'pending',
      icon: options.icon,
      category: options.category,
      metadata: options.metadata,
      items,
      total: items?.length,
      completed: 0,
      failed: 0,
      succeededItems: [],
      failedItems: [],
      errorStrategy: options.errorStrategy ?? TASK_QUEUE_DEFAULTS.errorStrategy,
      cancelable,
      retryable: options.retryable ?? TASK_QUEUE_DEFAULTS.retryable,
      confirmBeforeUnload,
      completionActions: options.completionActions as Task<TResult>['completionActions'],
      retryCount: 0,
      createdAt: Date.now(),
      _processor: processor as Task<TResult>['_processor'],
      _originalItems: items ? [...items] : undefined,
    };

    // Store processor in memory (can't be serialized to storage)
    this.processors.set(id, processor);

    // Store onComplete callback if provided
    if (options.onComplete) {
      this.onCompleteCallbacks.set(id, options.onComplete as (outcome: TaskOutcome) => void);
    }

    this.storage.set(id, task as Task);
    this.notify();

    // Start timeout timer
    const timeout = options.timeout ?? 300000; // Default 5 minutes
    const timeoutId = setTimeout(() => {
      this.handleTaskTimeout(id);
    }, timeout);
    this.taskTimeouts.set(id, timeoutId);

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

    const setCancelled = this.cancelFunctions.get(taskId);
    if (setCancelled) {
      setCancelled(true);
    }
  };

  retry = (taskId: string): void => {
    const task = this.storage.get(taskId);
    if (!task) return;
    if (task.status !== 'failed' && task.status !== 'cancelled') return;

    // Get processor from memory (wasn't serialized to storage)
    const processor = this.processors.get(taskId);
    if (!processor) {
      console.error('[TaskQueue] retry: no processor found for task', taskId);
      return;
    }

    // Check if this is a batch task (has items) or long process (no items)
    const isBatchTask = task.items && task.items.length > 0;

    if (isBatchTask) {
      // Batch task: Resume from where it stopped
      const remainingItems = this.getRetryItems(task);

      if (!remainingItems || remainingItems.length === 0) {
        // Edge case: All items already succeeded (cancel came too late)
        // Mark as completed instead of doing nothing
        const succeededItems = task.succeededItems ?? [];
        const originalItems = task._originalItems ?? task.items ?? [];

        if (succeededItems.length >= originalItems.length || task.completed >= (task.total ?? 0)) {
          task.status = 'completed';
          task.completedAt = Date.now();
          this.storage.set(taskId, task);
          this.notify();
          return;
        }

        console.warn('[TaskQueue] retry: no remaining items for task', taskId);
        return;
      }

      // Update task in-place for resume
      task.status = 'pending';
      task.items = remainingItems;
      // Keep completed count and total for continuous progress
      // Keep succeededItems for tracking
      // Reset only failed items for this retry attempt
      task.failedItems = [];
      task.failed = 0;
      task.retryCount += 1;
    } else {
      // Long process: Restart from beginning
      task.status = 'pending';
      task.completed = 0;
      task.failed = 0;
      task.succeededItems = [];
      task.failedItems = [];
      task.result = undefined;
      task.retryCount += 1;
    }

    // Clear timestamps for fresh run
    task.startedAt = undefined;
    task.completedAt = undefined;

    // Re-attach processor (ensure it's in the map)
    this.processors.set(taskId, processor);

    // Update task in storage
    this.storage.set(taskId, task);
    this.notify();
    this.drain();
  };

  private getRetryItems(task: Task): unknown[] | undefined {
    // Use _originalItems if available, otherwise fall back to items
    const originalItems = task._originalItems ?? task.items;
    if (!originalItems || originalItems.length === 0) return undefined;

    // Ensure arrays exist (backwards compatibility)
    const succeededItems = task.succeededItems ?? [];
    const failedItems = task.failedItems ?? [];

    // For cancelled tasks: retry items NOT in succeededItems
    if (task.status === 'cancelled' && succeededItems.length > 0) {
      const remaining = originalItems.filter((item) => {
        const itemId = this.resolveItemId(item);
        if (!itemId) return true; // Can't track, include it
        return !succeededItems.includes(itemId);
      });
      return remaining.length > 0 ? remaining : undefined;
    }

    // For failed tasks: retry only failed items
    if (task.status === 'failed' && failedItems.length > 0) {
      const failed = originalItems.filter((item) => {
        const itemId = this.resolveItemId(item);
        if (!itemId) return false;
        return failedItems.some((fi) => fi.id === itemId);
      });
      return failed.length > 0 ? failed : undefined;
    }

    // Fallback: retry all original items
    return originalItems;
  }

  /** Extract ID from an item using custom extractor or shared utility */
  private resolveItemId<TItem>(
    item: TItem,
    getItemId?: (item: TItem) => string
  ): string | undefined {
    if (getItemId) return getItemId(item);

    const id = extractItemId(item);
    if (id !== undefined) return id;

    // Fallback: stringify (only in queue context, not in UI)
    try {
      return JSON.stringify(item);
    } catch {
      return undefined;
    }
  }

  dismiss = (taskId: string): void => {
    const task = this.storage.get(taskId);
    if (!task) return;
    if (task.status === 'running' || task.status === 'pending') return;
    this.storage.remove(taskId);
    // Clean up processor from memory
    this.processors.delete(taskId);
    this.onCompleteCallbacks.delete(taskId);
    this.notify();
  };

  dismissAll = (): void => {
    const tasks = this.storage.getAll();
    tasks.forEach((task) => {
      if (task.status !== 'running' && task.status !== 'pending') {
        this.storage.remove(task.id);
        // Clean up processor from memory
        this.processors.delete(task.id);
        this.onCompleteCallbacks.delete(task.id);
      }
    });
    this.notify();
  };

  showSummary = (title: string, items: TaskSummaryItem[]): void => {
    this._activeSummary = { title, items };
    this.notify();
  };

  closeSummary = (): void => {
    this._activeSummary = null;
    this.notify();
  };

  getActiveSummary = (): TaskSummaryData | null => {
    return this._activeSummary;
  };

  // --- processItem API ---

  private buildProcessor<TItem, TResult>(
    options: ProcessItemEnqueueOptions<TItem, TResult>
  ): (ctx: TaskContext<TItem, TResult>) => Promise<void> {
    const { processItem, itemConcurrency = 1, getItemId, errorStrategy = 'continue' } = options;

    return async (ctx) => {
      const pending = [...ctx.items];
      const inFlight: Promise<void>[] = [];

      while (pending.length > 0 || inFlight.length > 0) {
        // Check cancellation
        if (ctx.cancelled) break;

        // Check stop-on-error
        if (errorStrategy === 'stop' && ctx.failedItems.length > 0) break;

        // Fill slots up to concurrency limit
        while (inFlight.length < itemConcurrency && pending.length > 0) {
          const item = pending.shift()!;
          const itemId = this.resolveItemId(item, getItemId) ?? String(item);

          const promise = this.processOneItem(item, itemId, processItem, ctx).finally(() => {
            // Remove from inFlight when done
            const idx = inFlight.indexOf(promise);
            if (idx !== -1) inFlight.splice(idx, 1);
          });

          inFlight.push(promise);
        }

        // Wait for at least one to complete before continuing
        if (inFlight.length > 0) {
          await Promise.race(inFlight);
        }
      }
    };
  }

  private async processOneItem<TItem, TResult>(
    item: TItem,
    itemId: string,
    processItem: (item: TItem, ctx: ItemContext) => Promise<void>,
    ctx: TaskContext<TItem, TResult>
  ): Promise<void> {
    let manuallyHandled = false;

    const itemCtx: ItemContext = {
      get cancelled() {
        return ctx.cancelled;
      },
      succeed: (id?: string) => {
        manuallyHandled = true;
        ctx.succeed(id ?? itemId);
      },
      fail: (id?: string, message?: string) => {
        manuallyHandled = true;
        ctx.fail(id ?? itemId, message);
      },
    };

    try {
      await processItem(item, itemCtx);
      // Auto-succeed if not manually handled
      if (!manuallyHandled) {
        ctx.succeed(itemId);
      }
    } catch (error) {
      // Auto-fail if not manually handled
      if (!manuallyHandled) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        ctx.fail(itemId, message);
      }
    }
  }

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

    // Attach processor from memory (wasn't serialized to storage)
    const processor = this.processors.get(task.id);
    if (!processor) {
      console.error('[TaskQueue] No processor found for task', task.id);
      this.runningCount -= 1;
      return;
    }
    task._processor = processor;

    try {
      const outcome = await executeTask(task, {
        onUpdate: (updated) => {
          this.storage.set(updated.id, updated);
          this.notify();
        },
        onCancelReady: (setCancelled) => {
          this.cancelFunctions.set(task.id, setCancelled);
        },
        onTaskComplete: () => {
          // Clear timeout when task completes (success or failure)
          this.clearTaskTimeout(task.id);
        },
      });

      // Call onComplete callback if provided
      const onComplete = this.onCompleteCallbacks.get(task.id);
      if (onComplete) {
        try {
          await onComplete(outcome);
        } catch (error) {
          console.error('[TaskQueue] onComplete callback error:', error);
        }
      }

      const resolver = this.taskResolvers.get(task.id);
      if (resolver) {
        resolver(outcome);
        this.taskResolvers.delete(task.id);
      }

      // Only clean up processor if task completed successfully (not failed/cancelled)
      // Failed/cancelled tasks keep processor for retry
      if (outcome.status === 'completed') {
        this.processors.delete(task.id);
        this.onCompleteCallbacks.delete(task.id);
      }
    } finally {
      this.runningCount -= 1;
      // Clean up cancel function
      this.cancelFunctions.delete(task.id);
      this.drain();
    }
  }

  private handleTaskTimeout(taskId: string): void {
    const task = this.storage.get(taskId);
    if (!task || task.status !== 'running') {
      // Task already completed or not running, ignore timeout
      return;
    }

    // Trigger cleanup callbacks (watch unsubscribe, etc.)
    const setCancelled = this.cancelFunctions.get(taskId);
    if (setCancelled) {
      setCancelled(true); // This calls all registered cleanup callbacks
    }

    // Mark task as failed with timeout error
    task.status = 'failed';
    task.completedAt = Date.now();
    task.failedItems = [
      ...task.failedItems,
      { message: 'Task timeout: exceeded maximum execution time' },
    ];
    task.failed += 1;

    this.storage.set(taskId, task);
    this.notify();

    // Resolve the promise
    const resolver = this.taskResolvers.get(taskId);
    if (resolver) {
      resolver({
        status: 'failed',
        completed: task.completed,
        failed: task.failed,
        failedItems: [...task.failedItems],
        result: task.result,
      });
      this.taskResolvers.delete(taskId);
    }

    // Clean up
    this.processors.delete(taskId);
    this.onCompleteCallbacks.delete(taskId);
    this.cancelFunctions.delete(taskId);
    this.taskTimeouts.delete(taskId);
  }

  private clearTaskTimeout(taskId: string): void {
    const timeoutId = this.taskTimeouts.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.taskTimeouts.delete(taskId);
    }
  }
}
