import type { ButtonProps } from '../button/button';
import type { ReactNode } from 'react';

// --- Task Status ---

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// --- Task ---

export interface Task<TResult = unknown> {
  id: string;
  title: string;
  status: TaskStatus;
  icon?: ReactNode;
  category?: string;

  // Items (optional — omit for single-process tasks)
  items?: unknown[];
  total?: number;

  // Counters
  completed: number;
  failed: number;

  // Item tracking for retry
  succeededItems: string[];
  failedItems: Array<{ id?: string; message: string }>;
  errorStrategy: 'continue' | 'stop';

  // Capabilities
  cancelable: boolean;
  retryable: boolean;

  // Result storage
  result?: TResult;

  // Actions
  completionActions?: ButtonProps[] | ((result: TResult) => ButtonProps[]);

  // Retry tracking
  retryOf?: string;
  retryCount: number;

  // Internal: processor reference (not serializable)
  _processor?: (ctx: TaskContext<unknown, TResult>) => Promise<void>;
  _originalItems?: unknown[];

  // Timestamps
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// --- Task Context ---

export interface TaskContext<TItem = unknown, TResult = unknown> {
  readonly items: TItem[];
  readonly cancelled: boolean;
  readonly failedItems: Array<{ id?: string; message: string }>;
  /** Mark current item as succeeded. Pass itemId to enable retry of remaining items on cancel. */
  succeed: (itemId?: string) => void;
  /** Mark current item as failed. Pass itemId and message for retry support. */
  fail: (itemId?: string, message?: string) => void;
  setTitle: (title: string) => void;
  setResult: (result: TResult) => void;
}

// --- Item Context (for processItem API) ---

export interface ItemContext {
  /** Check if task was cancelled */
  readonly cancelled: boolean;
  /** Override auto-detected item ID for retry tracking */
  succeed: (itemId?: string) => void;
  /** Override auto-detected item ID and customize error message */
  fail: (itemId?: string, message?: string) => void;
}

// --- Task Outcome ---

export interface TaskOutcome<TResult = unknown> {
  status: 'completed' | 'failed' | 'cancelled';
  completed: number;
  failed: number;
  failedItems: Array<{ id?: string; message: string }>;
  result?: TResult;
}

// --- Enqueue Options ---

interface BaseEnqueueOptions<TResult = unknown> {
  title: string;
  icon?: ReactNode;
  category?: string;
  errorStrategy?: 'continue' | 'stop';
  cancelable?: boolean;
  retryable?: boolean;
  completionActions?: ButtonProps[] | ((result: TResult) => ButtonProps[]);
  onComplete?: (outcome: TaskOutcome<TResult>) => void | Promise<void>;
}

/** Full control mode - consumer handles iteration */
export interface ProcessorEnqueueOptions<
  TItem = unknown,
  TResult = unknown,
> extends BaseEnqueueOptions<TResult> {
  processor: (ctx: TaskContext<TItem, TResult>) => Promise<void>;
  items?: TItem[];
  processItem?: never;
  itemConcurrency?: never;
  getItemId?: never;
}

/** Simplified mode - queue handles iteration */
export interface ProcessItemEnqueueOptions<
  TItem = unknown,
  TResult = unknown,
> extends BaseEnqueueOptions<TResult> {
  processItem: (item: TItem, ctx: ItemContext) => Promise<void>;
  items: TItem[];
  itemConcurrency?: number;
  getItemId?: (item: TItem) => string;
  processor?: never;
}

export type EnqueueOptions<TItem = unknown, TResult = unknown> =
  | ProcessorEnqueueOptions<TItem, TResult>
  | ProcessItemEnqueueOptions<TItem, TResult>;

// --- Task Handle ---

export interface TaskHandle<TResult = unknown> {
  id: string;
  cancel: () => void;
  promise: Promise<TaskOutcome<TResult>>;
}

// --- Redis Client Interface ---

export interface RedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  status?: string;
}

// --- Queue Config ---

export interface TaskQueueConfig {
  concurrency?: number;
  storage?: TaskStorage;
  storageKey?: string;
  storageType?: 'memory' | 'local' | 'auto';
  redisClient?: RedisClient | null;
}

// --- Storage ---

export interface TaskStorage {
  getAll: () => Task[];
  get: (id: string) => Task | undefined;
  set: (id: string, task: Task) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// --- Queue API (exposed via hook) ---

export interface TaskQueueAPI {
  enqueue: <TItem = unknown, TResult = unknown>(
    options: EnqueueOptions<TItem, TResult>
  ) => TaskHandle<TResult>;
  cancel: (taskId: string) => void;
  retry: (taskId: string) => void;
  dismiss: (taskId: string) => void;
  dismissAll: () => void;
  tasks: Task[];
}

export interface UseTaskQueueOptions {
  status?: TaskStatus;
}
