// Provider
export { TaskQueueProvider } from './provider';

// Hooks
export {
  useTaskQueue,
  useCurrentScope,
  useTasksWithLabels,
  matchesCurrentScope,
  getContextLabel,
} from './hooks';
export type { CurrentScope, TasksWithLabels } from './hooks';

// UI
export {
  TaskQueueDropdown,
  TaskQueueTrigger,
  TaskPanel,
  TaskPanelItem,
  TaskPanelHeader,
  TaskPanelCounter,
  TaskPanelActions,
  TaskSummaryDialog,
} from './core';
export type { TaskSummaryDialogProps } from './core';

// Engine (for advanced usage / custom storage)
export { TaskQueue, LocalTaskStorage, RedisTaskStorage, detectStorage } from './engine';

// Utils
export { createProjectMetadata, createOrgMetadata, createUserMetadata } from './utils';

// Types
export type {
  EnqueueOptions,
  ProcessorEnqueueOptions,
  ProcessItemEnqueueOptions,
  TaskHandle,
  TaskOutcome,
  TaskContext,
  ItemContext,
  TaskQueueConfig,
  TaskStorage,
  Task,
  TaskStatus,
  TaskMetadata,
  TaskQueueAPI,
  UseTaskQueueOptions,
  RedisClient,
  TaskSummaryItem,
  TaskSummaryData,
  TaskCompletionInfo,
} from './types';
