# ADR-009: Task Queue + K8s Async Operations Integration

**Status:** Accepted
**Date:** 2026-02-10

---

## Context

When creating K8s resources (projects, DNS zones, etc.), the control plane API returns HTTP 200 immediately to indicate the request was accepted, but the actual Kubernetes reconciliation happens asynchronously in the background. This can take anywhere from 30 seconds to 5+ minutes depending on the complexity of the resource and external dependencies (DNS propagation, certificate issuance, etc.).

Without proper handling, users face these issues:

1. **Unclear status** - User doesn't know if creation succeeded or failed
2. **Premature navigation** - User navigates away before resource is ready
3. **Manual polling** - User must refresh page to check status
4. **Poor UX** - No feedback during long-running operations

The task queue system exists for bulk operations but had no integration with K8s async operations. Additionally, there was no universal timeout protection - tasks could hang indefinitely if K8s reconciliation never completed.

## Decision

Integrate task queue with K8s Watch API to provide seamless async operation tracking with automatic timeout protection.

### Implementation

**1. Universal Timeout (All Tasks)**

Every task automatically times out after 5 minutes (configurable per-task):

```typescript
// Added to BaseEnqueueOptions
interface BaseEnqueueOptions {
  timeout?: number; // Default: 300000ms (5 minutes)
}
```

Timeout handling in `TaskQueue`:

- Timer starts when task begins execution
- Timer clears when task completes (success/failure)
- Timeout triggers automatic failure with clear error message

**2. Watch Wait Utility (Agnostic)**

Generic promise wrapper at `app/utils/helpers/watch-wait.helper.ts`:

```typescript
export function waitForWatch<T>(options: WatchWaitOptions): Promise<T>;
```

Key design decisions:

- **Agnostic** - No domain knowledge, only handles subscribe/unsubscribe
- **Callback-based** - Consumer controls resolution logic via `onEvent` callback
- **Reuses infrastructure** - Wraps existing `watchManager` singleton

**3. Resource-Specific Wait Functions (Decentralized)**

Each resource's `*.watch.ts` file adds a wait function:

```typescript
// app/resources/projects/project.watch.ts
export function waitForProjectReady(orgId: string, projectName: string): Promise<Project>;

// app/resources/dns-zones/dns-zone.watch.ts
export function waitForDnsZoneReady(projectId: string, zoneName: string): Promise<DnsZone>;
```

Each function handles:

- Transformation using resource-specific adapter
- Status checking using `transformControlPlaneStatus` helper
- Error detection via K8s condition analysis

**4. Usage in Task Processors**

Clean async/await syntax in processors:

```typescript
enqueue({
  title: 'Creating project',
  processor: async () => {
    // 1. Create via API (returns 200 immediately)
    const response = await createProject({ body: spec });

    // 2. Wait for K8s reconciliation (uses Watch API)
    const project = await waitForProjectReady(orgId, response.data.metadata.name);

    // 3. Task completes when Ready
    return project;
  },
});
```

### Architecture Benefits

| Aspect                           | Benefit                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Reuses Watch Infrastructure**  | Same `watchManager` that powers `useResourceWatch` - connection pooling, auto-reconnection, health checks all work automatically |
| **Universal Timeout**            | Every task protected from hanging indefinitely                                                                                   |
| **Simple Mental Model**          | Processor looks synchronous with async/await                                                                                     |
| **Decentralized Transformation** | Each resource handles its own domain logic                                                                                       |
| **Agnostic Utility**             | Watch wait helper has no domain knowledge                                                                                        |
| **Survives Navigation**          | Processor closure preserved even if user navigates away                                                                          |

## Rationale

**Why promise-wrapper pattern?**

We considered multiple approaches:

1. **External Control API** (`markSuccess`/`markFailed` from outside processor)
   - **Why rejected:** Task ID persistence problem across navigation

2. **Promise-wrapper pattern** (chosen)
   - **Pros:** Simple, survives navigation, no external state to track
   - **Cons:** Watch connection stays open until resolution (mitigated by connection pooling)

3. **Task Registry**
   - **Why rejected:** Too complex, requires centralized processor definitions

**Why universal timeout?**

Initially considered timeout only for "external control" tasks, but user feedback: _"why we need externalControl? can we just make it simple like if any process doesn't success/fail 5 minutes, it'll be auto fail"_

Universal timeout is simpler and protects all tasks, not just K8s operations.

**Why decentralized transformation?**

Keeps watch module agnostic. Each resource module knows how to transform and validate its own data. The watch wait utility just handles subscribe/unsubscribe.

## Alternatives Considered

### Option A: Polling After Creation

Poll K8s API until resource is ready:

```typescript
const project = await createProject(spec);
while (!isReady(project)) {
  await sleep(2000);
  project = await getProject(project.name);
}
```

- **Pros:** Simple implementation
- **Cons:** Wasteful (repeated requests), latency (2-5s between checks), doesn't leverage existing Watch infrastructure
- **Why rejected:** Watch API is more efficient and we already have the infrastructure

### Option B: Callback-Based Task Updates

Task processors call external `markSuccess`/`markFailed` from outside:

```typescript
const taskId = enqueue({ title: 'Creating project' });
const project = await createProject(spec);
await watchForReady(project.name);
markSuccess(taskId, project);
```

- **Pros:** Flexible, processor-agnostic
- **Cons:** Task ID must persist across navigation, more complex mental model
- **Why rejected:** User feedback: _"if using external mark, then i moved to another page, so i'll be lost the taskId right?"_

### Option C: Event-Based Updates

Emit events from Watch hooks, tasks listen:

```typescript
eventBus.on(`project:${projectName}:ready`, (project) => {
  completeTask(taskId, project);
});
```

- **Pros:** Decoupled
- **Cons:** Complex event routing, harder to debug, more code
- **Why rejected:** Over-engineering, promise-wrapper is simpler

## Consequences

### Positive

1. **Better UX** - Users see clear progress during async operations
2. **Automatic timeout** - No more hanging tasks
3. **Consistent pattern** - Same approach for all async K8s operations
4. **Reuses infrastructure** - Leverages existing Watch API integration
5. **Clean code** - Async/await syntax in processors

### Negative

1. **Watch connection overhead** - Connection stays open until resolution (mitigated by `watchManager` pooling)
2. **New pattern to learn** - Developers must know about wait helpers
3. **Resource-specific functions** - Each resource needs its own wait function (but this is intentional - decentralized transformation)

### Neutral

1. **Timeout is universal** - All tasks timeout after 5 minutes (can be overridden per-task if needed)
2. **Not cancellable via Watch** - If user cancels task, Watch connection closes but K8s reconciliation continues (this is expected - K8s operations can't be cancelled once started)

## Implementation Checklist

- [x] Add `timeout` field to `BaseEnqueueOptions`
- [x] Implement timeout handling in `TaskQueue` class
- [x] Update executor to clear timeouts on completion
- [x] Create `watch-wait.helper.ts` with `waitForWatch`
- [x] Add `waitForProjectReady` to `project.watch.ts`
- [x] Add `waitForDnsZoneReady` to `dns-zone.watch.ts`
- [x] Update task queue README documentation
- [x] Update CLAUDE.md with new pattern
- [ ] Migrate create-project action to use new pattern
- [ ] Add wait helpers for other resources (domains, http-proxies, etc.)

## Related ADRs

- [ADR-003: K8s Watch API Integration](./003-k8s-watch-api-integration.md) - Foundation for real-time updates
- [ADR-002: Domain-Driven Resource Modules](./002-domain-driven-resource-modules.md) - Resource organization pattern

## References

- Design document: `docs/plans/2026-02-10-task-queue-k8s-integration-design.md`
- Task queue README: `app/modules/datum-ui/components/task-queue/README.md`
- Watch infrastructure: `app/modules/watch/`
