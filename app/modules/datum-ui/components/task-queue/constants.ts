export const TASK_QUEUE_DEFAULTS = {
  concurrency: 3,
  errorStrategy: 'continue' as const,
  cancelable: true,
  retryable: true,
} as const;

export const TASK_STORAGE_KEY = 'datum-task-queue';
