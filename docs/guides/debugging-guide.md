# Debugging Guide

This guide covers debugging techniques and tools for the cloud portal.

---

## Quick Reference

| Issue Type | Tool/Technique |
|------------|----------------|
| React state | React DevTools |
| API data | React Query DevTools |
| Network requests | Browser Network tab |
| SSE/Watch | Network tab (EventStream) |
| Server errors | Terminal logs |
| Distributed tracing | Jaeger UI |
| Performance | Chrome Performance tab |

---

## Browser DevTools

### React DevTools

Install the [React DevTools extension](https://react.dev/learn/react-developer-tools).

**Features:**
- Inspect component tree
- View props and state
- Track renders
- Profile performance

**Usage:**
1. Open DevTools → Components tab
2. Select component in tree
3. View/edit props and state
4. Use search to find components

### React Query DevTools

Built into the app in development:

```tsx
// Already configured in app root
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
```

**Features:**
- View all queries and their state
- Inspect cache data
- Trigger refetches
- Clear cache
- View query timelines

**Access:**
- Click the floating React Query logo in bottom-right
- Or press `Ctrl/Cmd + Shift + Q`

---

## Network Debugging

### API Requests

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Click request to view:
   - Headers (auth token, content-type)
   - Request payload
   - Response data
   - Timing

### SSE/EventSource Debugging

Watch API uses Server-Sent Events:

1. Network tab → Filter by "EventSource" or "Other"
2. Find the watch request
3. Click to view events stream
4. Check "EventStream" tab for messages

**Common Issues:**
- Connection drops → Check auth token
- No events → Verify resource exists
- 401 errors → Token expired

---

## Server-Side Debugging

### Console Logging

Add logging to loaders/actions:

```typescript
export async function loader({ request, params }: LoaderFunctionArgs) {
  console.log('[Loader] Params:', params);
  console.log('[Loader] URL:', request.url);

  try {
    const data = await fetchData();
    console.log('[Loader] Data:', data);
    return data;
  } catch (error) {
    console.error('[Loader] Error:', error);
    throw error;
  }
}
```

### View Server Logs

```bash
# Development server logs
bun run dev

# Filter for specific patterns
bun run dev 2>&1 | grep '\[Loader\]'
```

---

## Distributed Tracing

### Local Jaeger

Start the observability stack:

```bash
bun run dev:otel
```

Access Jaeger UI: http://localhost:16686

### Finding Traces

1. Select "cloud-portal" service
2. Choose operation (e.g., "GET /api/...")
3. Set time range
4. Click "Find Traces"

### Trace Analysis

- **Spans**: Individual operations
- **Tags**: Metadata (route, user, org)
- **Logs**: Events within spans
- **Duration**: Time per operation

### Adding Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('cloud-portal');

async function debugOperation() {
  return tracer.startActiveSpan('debug-operation', async (span) => {
    span.setAttribute('custom.key', 'value');

    try {
      const result = await doWork();
      span.setAttribute('result.count', result.length);
      return result;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Common Debugging Scenarios

### "Data not loading"

**Checklist:**
1. Check Network tab for request
2. Verify response status (200, 401, 500?)
3. Check React Query DevTools for query state
4. Look for console errors
5. Check server logs

**Common Causes:**
- Auth token expired
- Wrong API endpoint
- Query key mismatch

### "Real-time updates not working"

**Checklist:**
1. Check Network tab for EventSource connection
2. Verify SSE connection is open
3. Check for 401/403 errors
4. Look at console for EventSource errors

**Debug Steps:**
```typescript
// Add logging to watch
watchResources({
  onEvent: (event) => {
    console.log('[Watch] Event:', event.type, event.object);
  },
  onError: (error) => {
    console.error('[Watch] Error:', error);
  },
});
```

### "Form not submitting"

**Checklist:**
1. Check for validation errors
2. Look at Network tab for request
3. Check action response
4. View console for errors

**Debug Steps:**
```tsx
<Form.Root
  schema={schema}
  onSubmit={async (data) => {
    console.log('[Form] Submitting:', data);
    try {
      await submit(data);
      console.log('[Form] Success');
    } catch (error) {
      console.error('[Form] Error:', error);
    }
  }}
>
```

### "Component not re-rendering"

**Checklist:**
1. Check if state actually changed (React DevTools)
2. Verify query is invalidated
3. Check for stale closure issues
4. Look for missing dependencies

**Debug Steps:**
```tsx
// Add useEffect to track renders
useEffect(() => {
  console.log('[Render] Data changed:', data);
}, [data]);
```

### "Styles not applying"

**Checklist:**
1. Inspect element in DevTools
2. Check computed styles
3. Look for class conflicts
4. Verify Tailwind class exists

**Debug Steps:**
1. Right-click element → Inspect
2. Check "Styles" panel
3. Look for crossed-out styles
4. Check "Computed" panel for final values

---

## Performance Debugging

### React Profiler

1. Open React DevTools → Profiler tab
2. Click "Record"
3. Perform action
4. Stop recording
5. Analyze flame graph

**Look For:**
- Long render times
- Unnecessary re-renders
- Expensive computations

### Chrome Performance

1. DevTools → Performance tab
2. Click "Record"
3. Perform action
4. Stop recording
5. Analyze timeline

**Look For:**
- Long tasks (blocking main thread)
- Layout thrashing
- Memory leaks

### Bundle Analysis

```bash
# Analyze bundle size
bun run build --analyze
```

---

## Debugging Utilities

### Console Helpers

```typescript
// Pretty print objects
console.log(JSON.stringify(data, null, 2));

// Table format for arrays
console.table(items);

// Group related logs
console.group('Operation');
console.log('Step 1');
console.log('Step 2');
console.groupEnd();

// Timing
console.time('operation');
await operation();
console.timeEnd('operation');
```

### Network Interception

```typescript
// Debug all fetch calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('[Fetch]', args[0]);
  const start = Date.now();
  try {
    const response = await originalFetch(...args);
    console.log('[Fetch] Response:', response.status, Date.now() - start, 'ms');
    return response;
  } catch (error) {
    console.error('[Fetch] Error:', error);
    throw error;
  }
};
```

### Query Debugging

```typescript
// Log all query activity
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onSuccess: (data) => console.log('[Query] Success:', data),
      onError: (error) => console.error('[Query] Error:', error),
    },
  },
});
```

---

## IDE Debugging

### VS Code

1. Create launch config:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Cloud Portal",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

2. Set breakpoints in code
3. Press F5 to start debugging
4. Use debug console for evaluation

### Breakpoints

```typescript
// Programmatic breakpoint
debugger;

// Conditional (in DevTools)
// Right-click line → Add conditional breakpoint
```

---

## Related Documentation

- [Observability](../operations/observability.md) - Tracing setup
- [Troubleshooting](../operations/troubleshooting.md) - Common issues
- [Testing](../development/testing.md) - Test debugging
