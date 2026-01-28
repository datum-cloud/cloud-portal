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
            ctx.succeed();
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

Cancel and retry are handled by the panel UI. To disable them per-task:

```tsx
enqueue({
  cancelable: false,  // Hides cancel button
  retryable: false,   // Hides retry button
  ...
});
```

### Custom Storage Key

For multi-tenant environments (e.g., shared Redis), use `storageKey` to isolate tasks per user:

```tsx
const { user } = useUser();

<TaskQueueProvider config={{
  storageKey: `datum-task-queue:${user.sub}`,
}}>
```

### Custom Storage Backend

```tsx
<TaskQueueProvider config={{
  concurrency: 5,
  storage: new RedisTaskStorage(redisClient, `datum-task-queue:${user.sub}`),
}}>
```

Or provide any object implementing `TaskStorage`:

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

| Method | Description |
| --- | --- |
| `enqueue(options)` | Add task to queue, returns `TaskHandle` |
| `cancel(taskId)` | Cancel a running task |
| `retry(taskId)` | Retry a failed/cancelled task |
| `dismiss(taskId)` | Remove a finished task from the panel |
| `dismissAll()` | Remove all completed/failed/cancelled tasks |
| `tasks` | Reactive array of all tasks |

### `EnqueueOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | required | Display title in the panel |
| `processor` | `(ctx) => Promise<void>` | required | The async work function |
| `items` | `T[]` | — | Items to process (enables counter UI) |
| `icon` | `ReactNode` | — | Custom icon for the task row |
| `category` | `string` | — | Optional grouping label |
| `errorStrategy` | `'continue' \| 'stop'` | `'continue'` | How to handle failures |
| `cancelable` | `boolean` | `true` | Show cancel button |
| `retryable` | `boolean` | `true` | Show retry button on failure |
| `completionActions` | `ButtonProps[] \| (result) => ButtonProps[]` | — | Buttons shown on completion |

### `TaskContext`

| Property/Method | Description |
| --- | --- |
| `items` | The items being processed |
| `cancelled` | Whether cancellation was requested |
| `failedItems` | Array of failed item details |
| `succeed()` | Increment completed counter |
| `fail(id?, msg?)` | Increment failed counter with details |
| `setTitle(title)` | Update task title mid-process |
| `setResult(result)` | Store result for completion actions |
