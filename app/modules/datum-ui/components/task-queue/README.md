# Task Queue

Background task management module for handling bulk actions and long-running processes. Tasks run independently of component lifecycle — users can navigate freely while operations complete in the background.

## Setup

Already mounted in `private.layout.tsx`. The `TaskQueueProvider` and `TaskPanel` are available on all authenticated routes.

## Usage

### Batch Task (with items)

Process a list of items with per-item progress tracking:

```tsx
import { useTaskQueue } from '@datum-ui/components/task-queue';

function MyComponent() {
  const { enqueue } = useTaskQueue();
  const { mutateAsync: createDomain } = useCreateDomain(projectId);
  const queryClient = useQueryClient();

  const handleBulkAdd = (domains: string[]) => {
    enqueue({
      title: `Adding ${domains.length} domains`,
      icon: <GlobeIcon className="size-4" />,
      items: domains,
      processor: async (ctx) => {
        for (const domain of ctx.items) {
          if (ctx.cancelled) break;
          try {
            await createDomain({ domainName: domain });
            ctx.succeed(domain); // Pass itemId for retry support
          } catch (error) {
            ctx.fail(domain, error.message);
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['domains', projectId] });
      },
      completionActions: [
        {
          children: 'View Domains',
          type: 'secondary',
          theme: 'outline',
          size: 'sm',
          onClick: () => navigate(`/project/${projectId}/domains`),
        },
      ],
    });

    // Close dialog immediately — task continues in background
    onClose();
  };
}
```

**Important:** Pass the `itemId` to `ctx.succeed(itemId)` to enable smart retry. If cancelled mid-way, retry will only process the remaining items, not the entire list.

### Single Long-Running Task (no items)

Wait for a single API call with indeterminate progress:

```tsx
enqueue({
  title: 'Generating Monthly Report',
  icon: <FileSpreadsheetIcon className="size-4" />,
  processor: async (ctx) => {
    const blob = await reportService.generateMonthlyReport(orgId, {
      startDate,
      endDate,
    });
    ctx.setResult(blob);
    ctx.succeed();
  },
  completionActions: (result) => [
    {
      children: 'Download Report',
      type: 'secondary',
      theme: 'outline',
      size: 'sm',
      onClick: () => {
        const url = URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    {
      children: 'Preview',
      type: 'quaternary',
      theme: 'borderless',
      size: 'sm',
      onClick: () => openPreviewDialog(result),
    },
  ],
});
```

### Long-Running Task with Cancellation Support

For truly cancellable long-running operations, use `AbortController`:

```tsx
enqueue({
  title: 'Generating Monthly Report',
  icon: <FileSpreadsheetIcon className="size-4" />,
  processor: async (ctx) => {
    const controller = new AbortController();

    // Check cancellation periodically and abort if requested
    const checkInterval = setInterval(() => {
      if (ctx.cancelled) {
        controller.abort();
        clearInterval(checkInterval);
      }
    }, 500);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ orgId, startDate, endDate }),
        signal: controller.signal, // Pass abort signal
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      ctx.setResult(blob);
      ctx.succeed();
    } catch (error) {
      if (error.name === 'AbortError') {
        // Cancelled by user — don't treat as failure
        return;
      }
      throw error;
    } finally {
      clearInterval(checkInterval);
    }
  },
});
```

**Note:** Without `AbortController`, cancellation only sets a flag. The in-flight request will complete, but the task will be marked as cancelled.

### Task Handle

`enqueue()` returns a `TaskHandle` for optional control:

```tsx
const task = enqueue({ ... });

// Cancel programmatically
task.cancel();

// Await completion (optional — fire-and-forget is the default)
const outcome = await task.promise;
console.log(outcome.status); // 'completed' | 'failed' | 'cancelled'
console.log(outcome.completed, outcome.failed);
```

### Reading Task State

```tsx
const { tasks } = useTaskQueue();
// All tasks

const { tasks: running } = useTaskQueue({ status: 'running' });
// Only running tasks
```

### Error Strategies

```tsx
// Default: continue processing all items, report failures at end
enqueue({ errorStrategy: 'continue', ... });

// Stop on first error
enqueue({ errorStrategy: 'stop', ... });
```

### Cancellation and Retry

Cancel is handled by the panel UI. To disable per-task:

```tsx
enqueue({
  cancelable: false,  // Hides cancel button
  ...
});
```

> **Note:** Retry button is currently disabled because processor functions cannot be persisted to storage. After page reload, the processor is lost. See `FUTURE_ENHANCEMENTS.md` for the processor registry pattern to re-enable retry.

#### How Cancellation Works

Cancellation is **cooperative** — it sets `ctx.cancelled = true`, but the processor must check this flag and stop itself.

| Scenario                     | Behavior                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Batch task (20 items)**    | Processor checks `ctx.cancelled` in loop and breaks. Task marked cancelled.                 |
| **Long-running single task** | Flag is set, but in-flight API calls continue. Use `AbortController` for true cancellation. |

#### How Retry Works (Currently Disabled)

> **Note:** Retry UI is currently disabled. The logic below is implemented but the button is hidden. See `FUTURE_ENHANCEMENTS.md` to re-enable.

Retry uses **in-place resume** — the same task continues rather than creating a new one.

| Task Type                   | Retry Behavior                                                                |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Batch (with items)**      | Resumes from where it stopped. Progress continues (e.g., 4/20 → 5/20 → 20/20) |
| **Long Process (no items)** | Restarts from beginning. Progress resets.                                     |

| Task Status   | Items Retried                                                         |
| ------------- | --------------------------------------------------------------------- |
| **Failed**    | Only the failed items (those passed to `ctx.fail(itemId)`)            |
| **Cancelled** | Only remaining items (excludes items passed to `ctx.succeed(itemId)`) |

**Example: Batch task cancelled at item 4 of 20**

```tsx
// Processor pattern for proper retry support:
processor: async (ctx) => {
  for (const domain of ctx.items) {
    if (ctx.cancelled) break;
    try {
      await createDomain({ domainName: domain });
      ctx.succeed(domain); // ← Pass itemId to track completion
    } catch (error) {
      ctx.fail(domain, error.message);
    }
  }
};
```

1. Items 1-4 complete → `ctx.succeed(domain)` tracks each
2. User clicks cancel → `ctx.cancelled = true`
3. Loop breaks at item 5
4. Task shows: `4/20 completed (cancelled)`
5. User clicks retry → same task resumes
6. Progress continues: `5/20 → 6/20 → ... → 20/20`

**Important:** If you don't pass `itemId` to `ctx.succeed()`, retry will re-process ALL items.

## Storage Options

### Storage Types

| Type                 | Behavior                              | Use Case                                             |
| -------------------- | ------------------------------------- | ---------------------------------------------------- |
| `'memory'` (default) | Tasks lost on page reload             | Best for most cases - clean session, no zombie tasks |
| `'local'`            | Tasks persist in localStorage         | When retry after reload is implemented               |
| `'auto'`             | Redis if available, else localStorage | Server-side task persistence                         |

```tsx
// Memory storage (default) - tasks lost on reload, with beforeunload warning
<TaskQueueProvider>

// Explicit memory storage
<TaskQueueProvider config={{ storageType: 'memory' }}>

// Persist to localStorage
<TaskQueueProvider config={{ storageType: 'local' }}>

// Auto-detect (Redis if available, else localStorage)
<TaskQueueProvider config={{ storageType: 'auto' }}>
```

**Note:** With memory storage, a browser confirmation dialog appears when the user tries to leave/reload while tasks are running or pending.

### Custom Storage Key

For multi-tenant environments, use `storageKey` to isolate tasks per user:

```tsx
<TaskQueueProvider config={{
  storageType: 'local',
  storageKey: `datum-task-queue:${user.sub}`,
}}>
```

### Using Redis Storage

Pass `redisClient` with `storageType: 'auto'` to use Redis when available:

```tsx
import { redis } from '@/modules/redis';

<TaskQueueProvider config={{
  storageType: 'auto',
  storageKey: `datum-task-queue:${user.sub}`,
  redisClient: redis, // Uses Redis if redis.status === 'ready'
}}>
```

The `detectStorage` function handles this automatically:

- If `redisClient.status === 'ready'` → uses `RedisTaskStorage`
- Otherwise → falls back to `LocalTaskStorage`

All storage backends are **SSR-safe** and return empty data during server rendering.

### Manual Storage Backend

For full control, pass a custom `storage` instance:

```tsx
import { MemoryTaskStorage, LocalTaskStorage, RedisTaskStorage } from '@datum-ui/components/task-queue';

<TaskQueueProvider config={{
  storage: new RedisTaskStorage(redisClient, `datum-task-queue:${user.sub}`),
}}>
```

Or implement the `TaskStorage` interface:

```tsx
<TaskQueueProvider config={{
  storage: {
    getAll: () => [...],
    get: (id) => ...,
    set: (id, task) => ...,
    remove: (id) => ...,
    clear: () => ...,
  },
}}>
```

## API Reference

### `useTaskQueue(options?)`

| Method             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `enqueue(options)` | Add task to queue, returns `TaskHandle`               |
| `cancel(taskId)`   | Cancel a running task                                 |
| `retry(taskId)`    | Retry a failed/cancelled task (UI currently disabled) |
| `dismiss(taskId)`  | Remove a finished task from the panel                 |
| `dismissAll()`     | Remove all completed/failed/cancelled tasks           |
| `tasks`            | Reactive array of all tasks                           |

### `EnqueueOptions`

| Option              | Type                                         | Default      | Description                                       |
| ------------------- | -------------------------------------------- | ------------ | ------------------------------------------------- |
| `title`             | `string`                                     | required     | Display title in the panel                        |
| `processor`         | `(ctx) => Promise<void>`                     | required     | The async work function                           |
| `items`             | `T[]`                                        | —            | Items to process (enables counter UI)             |
| `icon`              | `ReactNode`                                  | —            | Custom icon for the task row                      |
| `category`          | `string`                                     | —            | Optional grouping label                           |
| `errorStrategy`     | `'continue' \| 'stop'`                       | `'continue'` | How to handle failures                            |
| `cancelable`        | `boolean`                                    | `true`       | Show cancel button                                |
| `retryable`         | `boolean`                                    | `true`       | Show retry button on failure (currently disabled) |
| `completionActions` | `ButtonProps[] \| (result) => ButtonProps[]` | —            | Buttons shown on completion                       |

### `TaskContext`

| Property/Method       | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `items`               | The items being processed                                                             |
| `cancelled`           | Whether cancellation was requested                                                    |
| `failedItems`         | Array of failed item details                                                          |
| `succeed(itemId?)`    | Increment completed counter. Pass `itemId` to enable smart retry on cancel.           |
| `fail(itemId?, msg?)` | Increment failed counter with details. Pass `itemId` to enable retry of failed items. |
| `setTitle(title)`     | Update task title mid-process                                                         |
| `setResult(result)`   | Store result for completion actions                                                   |
