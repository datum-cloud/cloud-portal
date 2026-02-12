# Future Enhancements

## Retry After Page Reload

### Current Limitation

The retry functionality only works within the same browser session. After a page reload, the retry button is hidden because:

1. Task data (title, status, items, progress) is persisted to localStorage
2. Processor functions cannot be serialized to localStorage
3. Without the processor, retry has no function to execute

### Solution: Processor Registry Pattern

To enable retry after page reload, implement a **processor registry** that maps task categories to their processor functions.

#### 1. Update Types

```typescript
// types.ts
export interface ProcessorRegistry {
  [category: string]: Task['_processor'];
}

export interface TaskQueueConfig {
  concurrency?: number;
  storage?: TaskStorage;
  storageKey?: string;
  redisClient?: RedisClient;
  processorRegistry?: ProcessorRegistry; // Add this
}
```

#### 2. Update TaskQueue

```typescript
// engine/queue.ts
export class TaskQueue {
  private processorRegistry: ProcessorRegistry = {};

  constructor(config: TaskQueueConfig = {}) {
    // ... existing code
    if (config.processorRegistry) {
      this.processorRegistry = config.processorRegistry;
    }
  }

  retry = (taskId: string): void => {
    const task = this.storage.get(taskId);
    if (!task) return;
    if (task.status !== 'failed' && task.status !== 'cancelled') return;

    // Try memory first (same session), then registry (after reload)
    let processor = this.processors.get(taskId);

    if (!processor && task.category) {
      processor = this.processorRegistry[task.category];
      if (processor) {
        this.processors.set(taskId, processor);
      }
    }

    if (!processor) {
      console.error('[TaskQueue] retry: no processor found for task', taskId);
      return;
    }

    // ... rest of retry logic
  };
}
```

#### 3. Consumer Setup

```tsx
// app/providers/task-queue-setup.tsx

// Define all processors in a centralized registry
export const taskProcessors: ProcessorRegistry = {
  'domain-add': async (ctx) => {
    for (const domain of ctx.items) {
      if (ctx.cancelled) break;
      try {
        await addDomain(domain);
        ctx.succeed(domain);
      } catch (error) {
        ctx.fail(domain, error.message);
      }
    }
  },

  'file-upload': async (ctx) => {
    for (const file of ctx.items) {
      if (ctx.cancelled) break;
      try {
        await uploadFile(file);
        ctx.succeed(file.name);
      } catch (error) {
        ctx.fail(file.name, error.message);
      }
    }
  },

  'bulk-delete': async (ctx) => {
    for (const item of ctx.items) {
      if (ctx.cancelled) break;
      try {
        await deleteItem(item.id);
        ctx.succeed(item.id);
      } catch (error) {
        ctx.fail(item.id, error.message);
      }
    }
  },
};

// Provide to TaskQueueProvider
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TaskQueueProvider config={{ processorRegistry: taskProcessors }}>{children}</TaskQueueProvider>
  );
}
```

#### 4. Enqueue with Category

```tsx
// When enqueuing, always specify a category that matches the registry
const { enqueue } = useTaskQueue();

function handleAddDomains(domains: string[]) {
  enqueue({
    title: `Adding ${domains.length} domains`,
    category: 'domain-add', // Must match registry key
    items: domains,
    processor: taskProcessors['domain-add'],
    retryable: true,
  });
}
```

### How It Works

| Scenario                 | Processor Source              | Works? |
| ------------------------ | ----------------------------- | ------ |
| Same session, no reload  | In-memory `processors` Map    | Yes    |
| After page reload        | Registry lookup by `category` | Yes    |
| No category specified    | Cannot find processor         | No     |
| Category not in registry | Cannot find processor         | No     |

### Trade-offs

**Pros:**

- Retry works after page reload
- Processors defined once, reused everywhere
- Clear mapping between task types and processors

**Cons:**

- Requires centralized processor definitions
- All processors must be registered at app startup
- Category must be specified on every enqueue call

### Alternative: Session-Only Retry

If centralized processors are too restrictive, keep retry working only within the same session:

1. Keep retry logic as-is (works within session)
2. Show retry button only when processor exists in memory
3. After reload, show only dismiss button

This requires exposing processor availability to the UI:

```typescript
// In TaskQueue
hasProcessor(taskId: string): boolean {
  return this.processors.has(taskId);
}

// In useTaskQueue hook
const canRetry = (task: Task) => {
  return task.retryable &&
    (task.status === 'failed' || task.status === 'cancelled') &&
    queue.hasProcessor(task.id);
};
```

## Other Potential Enhancements

### Task Priority

Add priority levels to control execution order:

```typescript
interface EnqueueOptions {
  priority?: 'high' | 'normal' | 'low';
}
```

### Progress Bar UI

Add visual progress indicator for batch tasks:

```tsx
<div className="bg-muted h-1 overflow-hidden rounded-full">
  <div
    className="bg-primary h-full transition-all"
    style={{ width: `${(completed / total) * 100}%` }}
  />
</div>
```

### Task Groups

Group related tasks together:

```typescript
interface EnqueueOptions {
  groupId?: string;
  groupTitle?: string;
}
```

### Notification Integration

Notify user when background tasks complete:

```typescript
interface TaskQueueConfig {
  onTaskComplete?: (task: Task) => void;
  onTaskFail?: (task: Task) => void;
}
```
