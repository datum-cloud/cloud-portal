# Task Queue

Background task management module for handling bulk actions and long-running processes. Tasks run independently of component lifecycle — users can navigate freely while operations complete in the background.

## Setup

Already mounted in `private.layout.tsx`. The `TaskQueueProvider` wraps all authenticated routes, and `TaskQueueDropdown` is rendered in the header component.

## Usage

### Batch Task with `processItem` (Recommended)

The simplest way to process a list of items. The queue handles iteration, cancellation, and progress tracking automatically:

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
      processItem: async (domain) => {
        await createDomain({ domainName: domain });
      },
      onComplete: () => queryClient.invalidateQueries({ queryKey: ['domains', projectId] }),
    });

    // Close dialog immediately — task continues in background
    onClose();
  };
}
```

### Parallel Processing with `itemConcurrency`

Process multiple items concurrently for faster execution:

```tsx
enqueue({
  title: `Uploading ${files.length} files`,
  items: files,
  itemConcurrency: 3, // Process 3 items at a time
  processItem: async (file) => {
    await uploadFile(file);
  },
});
```

**Concurrency flow (10 items, concurrency 3):**

```
Slot 1: [item1]────[item4]────[item7]────[item10]
Slot 2: [item2]────[item5]────[item8]────
Slot 3: [item3]────[item6]────[item9]────
```

As soon as one item finishes, the next starts. Progress updates after each item.

### Custom Error Handling

Override auto-detection with custom error messages:

```tsx
enqueue({
  title: `Deleting ${records.length} records`,
  items: records,
  processItem: async (record, ctx) => {
    try {
      await deleteRecord(record.id);
    } catch (error) {
      ctx.fail(record.id, `Cannot delete "${record.name}": ${error.message}`);
    }
  },
});
```

### Custom Item ID (for objects)

By default, the queue extracts IDs from items automatically (`item.id` → `item.name` → `item.key` → `item.uuid` → `JSON.stringify`). Override when needed:

```tsx
enqueue({
  title: `Processing ${orders.length} orders`,
  items: orders,
  getItemId: (order) => order.orderNumber,
  processItem: async (order) => {
    await processOrder(order);
  },
});
```

### Using `onComplete` Outcome

```tsx
enqueue({
  title: `Sending ${emails.length} emails`,
  items: emails,
  itemConcurrency: 5,
  processItem: async (email) => {
    await sendEmail(email);
  },
  onComplete: (outcome) => {
    if (outcome.failed > 0) {
      toast.warning(`Sent ${outcome.completed}, failed ${outcome.failed}`);
    } else {
      toast.success(`All ${outcome.completed} emails sent`);
    }
  },
});
```

### Single Long-Running Task (use `processor`)

For tasks without items, use the `processor` API:

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
      onClick: () => downloadBlob(result, 'report.csv'),
    },
  ],
});
```

### Full Control with `processor`

For complex flows (custom batching, conditional logic), use `processor`:

```tsx
enqueue({
  title: 'Processing records',
  items: records,
  processor: async (ctx) => {
    // Custom batching
    const chunks = chunkArray(ctx.items, 10);
    for (const chunk of chunks) {
      if (ctx.cancelled) break;
      await bulkInsert(chunk);
      chunk.forEach((item) => ctx.succeed(item.id));
    }
  },
});
```

### When to Use Which

| Use `processItem`               | Use `processor`                            |
| ------------------------------- | ------------------------------------------ |
| Simple per-item CRUD            | No items (single task)                     |
| Straightforward async call      | Custom batching                            |
| Want auto success/fail handling | Complex conditional logic                  |
| Want parallel processing        | Need `ctx.setResult()` or `ctx.setTitle()` |

### K8s Async Operations

For operations that create K8s resources (projects, DNS zones, etc.), use watch helpers with `ctx.onCancel()` for automatic cleanup:

```tsx
import { createProject } from '@/resources/projects/project.service';
import { waitForProjectReady } from '@/resources/projects/project.watch';
import { useTaskQueue } from '@datum-ui/components/task-queue';

function MyComponent() {
  const { enqueue } = useTaskQueue();

  const handleCreateProject = (data: CreateProjectInput) => {
    enqueue({
      title: `Creating project "${data.displayName}"`,
      icon: <FolderPlusIcon className="size-4" />,
      timeout: 300000, // 5 minutes (default if omitted)
      processor: async (ctx) => {
        // 1. Submit to API (returns 200 immediately)
        await createProject({
          name: data.name,
          description: data.displayName,
          organizationId: orgId,
        });

        // 2. Wait for K8s reconciliation
        const { promise, cancel } = waitForProjectReady(orgId, data.name);
        ctx.onCancel(cancel); // Register cleanup - called automatically on cancel/timeout

        const project = await promise;

        // 3. Task completes when Ready
        ctx.setResult(project);
        ctx.succeed();
      },
    });

    // Close dialog immediately — task continues in background
    onClose();
  };
}
```

**Available wait helpers:**

- `waitForProjectReady(orgId, projectName)` - Wait for project Ready status
- `waitForDnsZoneReady(projectId, zoneName)` - Wait for DNS zone Ready status

**How cancellation works:**

When a task is cancelled or times out:
1. Task queue calls `setCancelled(true)`
2. All functions registered via `ctx.onCancel()` are called automatically
3. Watch subscriptions are cleaned up, preventing memory leaks

Each `waitForXxxReady` call gets its own watch subscription. Canceling one task doesn't affect others.

**Multiple watch subscriptions in one task:**

You can register multiple cleanup functions in a single task:

```tsx
processor: async (ctx) => {
  // Watch multiple resources
  const { promise: project, cancel: cancelProject } = waitForProjectReady(orgId, name);
  const { promise: zone, cancel: cancelZone } = waitForDnsZoneReady(projectId, zoneName);

  // Register all cleanup functions
  ctx.onCancel(cancelProject);
  ctx.onCancel(cancelZone);

  // Both subscriptions will be cleaned up on cancel/timeout
  const [readyProject, readyZone] = await Promise.all([project, zone]);

  ctx.setResult({ project: readyProject, zone: readyZone });
  ctx.succeed();
}
```

**Browser confirmation for K8s operations:**

K8s resource creation (projects, DNS zones) should keep the default `confirmBeforeUnload: true` because they're mutating operations. However, for read-only operations like exports, you can skip confirmation:

```tsx
// Mutation - Keep default confirmation
enqueue({
  title: 'Creating DNS zone',
  // confirmBeforeUnload: true (default) ✅
  processor: async (ctx) => {
    await createDnsZone({ ... });
    const { promise, cancel } = waitForDnsZoneReady(projectId, zoneName);
    ctx.onCancel(cancel);
    await promise;
  }
});

// Read-only export - Can skip confirmation
enqueue({
  title: 'Exporting DNS records',
  confirmBeforeUnload: false, // ✅ Safe - read-only, can retry
  processor: async () => {
    const records = await fetchAllDnsRecords(projectId);
    downloadAsJSON(records);
  }
});
```

**The task will automatically fail if:**

- K8s resource reports error condition
- Watch API connection fails
- Timeout is exceeded (default 5 minutes)
- Task is cancelled (all registered cleanup callbacks called automatically)

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

### Cancellation

Cancel is handled by the panel UI. To disable per-task:

```tsx
enqueue({
  cancelable: false,  // Hides cancel button
  ...
});
```

Cancellation is **cooperative**:

- `processItem`: Queue checks cancellation between items automatically
- `processor`: You must check `ctx.cancelled` in your loop

### Browser Confirmation on Unload

By default, the task queue shows a browser confirmation dialog when users try to close/reload the page while tasks are active. This prevents accidental data loss.

**Control per-task with `confirmBeforeUnload`:**

```tsx
// Default: Show confirmation for important operations
enqueue({
  title: 'Creating 50 DNS records',
  confirmBeforeUnload: true, // Default - always confirm
  processor: async (ctx) => {
    // Mutation operations - user MUST be warned
    await createRecords();
  }
});

// Skip confirmation for non-critical background tasks
enqueue({
  title: 'Warming cache',
  confirmBeforeUnload: false, // Safe - can be interrupted
  processor: async () => {
    await prefetchData();
  }
});
```

**When to use `confirmBeforeUnload: false`:**

✅ **Safe to skip confirmation:**
- Background/analytics tasks (cache updates, metrics)
- Quick operations (< 5 seconds)
- Read-only operations that can be retried
- Idempotent operations with no side effects

⚠️ **MUST keep confirmation (default true):**
- Mutating operations (creates, updates, deletes)
- Long-running operations (> 5 seconds)
- Operations with side effects (emails, billing, external APIs)
- Batch operations processing user data

**How it works:**

The confirmation shows if **ANY** active task has `confirmBeforeUnload: true`. This ensures important operations are never lost, even if mixed with background tasks.

```tsx
// Scenario: 10 tasks running
// - 9 tasks with confirmBeforeUnload: false (background tasks)
// - 1 task with confirmBeforeUnload: true (creating project)
// Result: Confirmation WILL show (the important task wins)
```

**Development Warning:**

In development mode, you'll see a warning if you set `confirmBeforeUnload: false` on a non-cancelable task:

```
[TaskQueue] Task "X" is not cancelable but has confirmBeforeUnload: false.
This may lead to data loss if the user closes the page.
Consider setting confirmBeforeUnload: true (default).
```

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

**Note:** A browser confirmation dialog appears when the user tries to leave/reload while tasks with `confirmBeforeUnload: true` (default) are running or pending. See [Browser Confirmation on Unload](#browser-confirmation-on-unload) for details.

### Custom Storage Key

For multi-tenant environments, use `storageKey` to isolate tasks per user:

```tsx
<TaskQueueProvider config={{
  storageType: 'local',
  storageKey: `datum-task-queue:${user.sub}`,
}}>
```

## API Reference

### `useTaskQueue(options?)`

| Method             | Description                                 |
| ------------------ | ------------------------------------------- |
| `enqueue(options)` | Add task to queue, returns `TaskHandle`     |
| `cancel(taskId)`   | Cancel a running task                       |
| `retry(taskId)`    | Retry a failed/cancelled task               |
| `dismiss(taskId)`  | Remove a finished task from the panel       |
| `dismissAll()`     | Remove all completed/failed/cancelled tasks |
| `tasks`            | Reactive array of all tasks                 |

### `EnqueueOptions` (processItem mode)

| Option              | Type                                         | Default      | Description                             |
| ------------------- | -------------------------------------------- | ------------ | --------------------------------------- |
| `title`             | `string`                                     | required     | Display title in the panel              |
| `items`             | `T[]`                                        | required     | Items to process                        |
| `processItem`       | `(item, ctx) => Promise<void>`               | required     | Process one item                        |
| `itemConcurrency`   | `number`                                     | `1`          | How many items to process in parallel   |
| `getItemId`         | `(item) => string`                           | auto-detect  | Extract ID from item for tracking       |
| `onComplete`        | `(outcome) => void`                          | —            | Called when task finishes               |
| `icon`              | `ReactNode`                                  | —            | Custom icon for the task row            |
| `category`            | `string`                                     | —            | Optional grouping label                       |
| `errorStrategy`       | `'continue' \| 'stop'`                       | `'continue'` | How to handle failures                        |
| `cancelable`          | `boolean`                                    | `true`       | Show cancel button                            |
| `confirmBeforeUnload` | `boolean`                                    | `true`       | Show browser warning when closing/reloading   |
| `timeout`             | `number`                                     | `300000`     | Timeout in milliseconds (default 5 min)       |
| `completionActions`   | `ButtonProps[] \| (result) => ButtonProps[]` | —            | Buttons shown on completion                   |

### `EnqueueOptions` (processor mode)

| Option              | Type                                         | Default      | Description                             |
| ------------------- | -------------------------------------------- | ------------ | --------------------------------------- |
| `title`             | `string`                                     | required     | Display title in the panel              |
| `processor`         | `(ctx) => Promise<void>`                     | required     | The async work function                 |
| `items`             | `T[]`                                        | —            | Items to process (enables counter UI)   |
| `onComplete`        | `(outcome) => void`                          | —            | Called when task finishes               |
| `icon`              | `ReactNode`                                  | —            | Custom icon for the task row            |
| `category`            | `string`                                     | —            | Optional grouping label                       |
| `errorStrategy`       | `'continue' \| 'stop'`                       | `'continue'` | How to handle failures                        |
| `cancelable`          | `boolean`                                    | `true`       | Show cancel button                            |
| `confirmBeforeUnload` | `boolean`                                    | `true`       | Show browser warning when closing/reloading   |
| `timeout`             | `number`                                     | `300000`     | Timeout in milliseconds (default 5 min)       |
| `completionActions`   | `ButtonProps[] \| (result) => ButtonProps[]` | —            | Buttons shown on completion                   |

### `ItemContext` (for processItem)

| Property/Method       | Description                                   |
| --------------------- | --------------------------------------------- |
| `cancelled`           | Whether cancellation was requested            |
| `succeed(itemId?)`    | Override auto-succeed with custom item ID     |
| `fail(itemId?, msg?)` | Override auto-fail with custom ID and message |

### `TaskContext` (for processor)

| Property/Method       | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `items`               | The items being processed                                                             |
| `cancelled`           | Whether cancellation was requested                                                    |
| `failedItems`         | Array of failed item details                                                          |
| `succeed(itemId?)`    | Increment completed counter. Pass `itemId` to enable smart retry on cancel.           |
| `fail(itemId?, msg?)` | Increment failed counter with details. Pass `itemId` to enable retry of failed items. |
| `setTitle(title)`     | Update task title mid-process                                                         |
| `setResult(result)`   | Store result for completion actions                                                   |

### `TaskOutcome`

| Property      | Type                                      | Description                |
| ------------- | ----------------------------------------- | -------------------------- |
| `status`      | `'completed' \| 'failed' \| 'cancelled'`  | Final task status          |
| `completed`   | `number`                                  | Number of successful items |
| `failed`      | `number`                                  | Number of failed items     |
| `failedItems` | `Array<{ id?: string; message: string }>` | Details of failures        |
| `result`      | `TResult`                                 | Result set via `setResult` |
