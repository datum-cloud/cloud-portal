# Data Flow & Request Lifecycle

This document explains how data flows through the application, from user interaction to API and back.

---

## Request Lifecycle Overview

```
User Action
    │
    ▼
┌─────────────────┐
│   React Router  │──► Route matched
│     Router      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Loader      │──► Server-side data fetch (SSR)
│   (server)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Component    │──► Page renders with data
│   (client)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Query    │──► Client-side caching & updates
│   useQuery()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Watch API     │──► Real-time updates via SSE
│  (EventSource)  │
└─────────────────┘
```

---

## Server-Side Rendering (SSR)

### Loader Execution

When a route is requested, the loader runs on the server first:

```typescript
// app/routes/organizations/index.tsx
import { getOrganizations } from '@/resources/organizations';

export async function loader({ context }: Route.LoaderArgs) {
  const { session, logger } = context;

  // Ensure user is authenticated
  if (!session) {
    throw redirect('/login');
  }

  // Fetch data server-side
  logger.info('Loading organizations');
  const organizations = await getOrganizations();

  // Return data to component
  return { organizations };
}
```

### Context Available in Loaders

The `context` object contains:

| Property    | Type              | Description                    |
| ----------- | ----------------- | ------------------------------ |
| `session`   | `Session \| null` | User session with access token |
| `logger`    | `Logger`          | Request-scoped logger          |
| `requestId` | `string`          | Unique request identifier      |
| `cspNonce`  | `string`          | CSP nonce for inline scripts   |

### Benefits of SSR

1. **Fast initial load** - HTML includes data, no loading spinner
2. **SEO friendly** - Content visible to crawlers
3. **No flash of loading state** - Page renders complete

---

## Client-Side Data Flow

### React Query Integration

After SSR, React Query takes over for client-side state:

```typescript
// In component
export default function OrganizationsPage({ loaderData }: Route.ComponentProps) {
  // Use SSR data as initial, React Query manages updates
  const { data: organizations } = useOrganizations({
    initialData: loaderData.organizations,
  });

  return <OrganizationList items={organizations} />;
}
```

### Query Hook Pattern

```typescript
// app/resources/organizations/organization.queries.ts
export function useOrganizations(options?: { initialData?: Organization[] }) {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationService.list(),
    initialData: options?.initialData,
    staleTime: 30_000, // Consider fresh for 30s
  });
}
```

### Cache Behavior

| Scenario            | Behavior                  |
| ------------------- | ------------------------- |
| Initial load        | Uses SSR data (no fetch)  |
| Navigation          | Uses cached data if fresh |
| Stale data          | Background refetch        |
| Window focus        | Automatic revalidation    |
| Manual invalidation | Immediate refetch         |

---

## Mutations & Optimistic Updates

### Mutation Pattern

```typescript
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationService.delete(id),

    // Optimistic update - instant UI feedback
    onMutate: async (id) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['organizations'] });

      // Snapshot current data
      const previous = queryClient.getQueryData(['organizations']);

      // Optimistically remove item
      queryClient.setQueryData(['organizations'], (old: Organization[]) =>
        old.filter((org) => org.id !== id)
      );

      return { previous };
    },

    // Rollback on error
    onError: (err, id, context) => {
      queryClient.setQueryData(['organizations'], context?.previous);
    },

    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
```

### Flow

```
User clicks "Delete"
        │
        ▼
┌─────────────────┐
│  onMutate()     │──► Immediately remove from UI
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  mutationFn()   │──► API call in background
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Success    Error
    │         │
    ▼         ▼
onSettled  onError()
    │      Rollback UI
    ▼
Refetch latest
```

---

## Real-Time Updates (Watch API)

### How Watch Works

The Watch API uses Server-Sent Events (SSE) to stream updates from Kubernetes:

```
Browser                    Server                    K8s
   │                          │                        │
   │──── EventSource ────────►│                        │
   │     /api/watch?...       │──── Watch Request ────►│
   │                          │                        │
   │◄─── SSE: ADDED ─────────│◄─── Event Stream ──────│
   │◄─── SSE: MODIFIED ──────│                        │
   │◄─── SSE: DELETED ───────│                        │
   │                          │                        │
```

### Watch Hook Usage

```typescript
// In component
function DNSZonesPage() {
  const { data: zones } = useDNSZones();

  // Enable real-time updates
  useDNSZonesWatch({
    onEvent: (event) => {
      // Cache automatically updated
      console.log('Zone changed:', event.type, event.object);
    },
  });

  return <ZoneList zones={zones} />;
}
```

### Event Types

| Event      | Meaning              | Cache Action     |
| ---------- | -------------------- | ---------------- |
| `ADDED`    | New resource created | Add to list      |
| `MODIFIED` | Resource updated     | Update in list   |
| `DELETED`  | Resource removed     | Remove from list |

---

## API Service Layer

### Service Pattern

Services encapsulate API calls and transformations:

```typescript
// app/resources/organizations/organization.service.ts
import { toOrganizations } from './organization.adapter';
import { getOrganizations as apiGetOrganizations } from '@/modules/control-plane/iam';

export async function list(): Promise<Organization[]> {
  const response = await apiGetOrganizations();
  return toOrganizations(response.data?.items ?? []);
}
```

### Request Flow (REST)

```
Component
    │
    ▼
React Query Hook (useOrganizations)
    │
    ▼
Service (organization.service.ts)
    │
    ▼
Generated Client (@hey-api)
    │
    ▼
Axios (with interceptors)
    │
    ▼
Control Plane API
```

### Request Flow (GraphQL)

```
Component
    │
    ▼
React Query Hook (useOrganizationsGql)
    │
    ▼
GQL Service (organization.gql-service.ts)
    │
    ▼
Gqlts Client (createGqlClient)
    │
    ▼
Axios (with interceptors)
    │
    ▼
GraphQL Gateway
```

---

## GraphQL Data Flow

GraphQL provides an alternative to REST for complex queries with field selection.

### Environment Detection

The Gqlts client automatically routes based on environment:

```
┌─────────────────────────────────────────────────────────────┐
│                     createGqlClient(scope)                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Server (SSR/Loader)   │     │   Client (Browser)      │
├─────────────────────────┤     ├─────────────────────────┤
│ - Direct to GRAPHQL_URL │     │ - Through /api/graphql  │
│ - Auth from context     │     │ - Auth via cookies      │
│ - Curl logging          │     │ - Sentry capture        │
└─────────────────────────┘     └─────────────────────────┘
```

### Scoped Endpoints

GraphQL endpoints are scoped to different contexts:

| Scope     | Use Case                                      |
| --------- | --------------------------------------------- |
| `user`    | User-specific data (memberships, preferences) |
| `org`     | Organization resources                        |
| `project` | Project resources                             |
| `global`  | Cross-cutting queries                         |

### Example Usage

```typescript
// In loader (server-side)
const client = createGqlClient({ type: 'user', userId: 'me' });
const result = await client.query({
  listOrganizationMemberships: {
    items: { metadata: { name: true }, status: { organization: { displayName: true } } },
  },
});
```

See [GraphQL Architecture](./graphql.md) for full details.

---

## Error Handling

### Server-Side Errors (Loaders)

```typescript
export async function loader({ context }: Route.LoaderArgs) {
  try {
    const data = await service.getData();
    return { data };
  } catch (error) {
    context.logger.error('Failed to load data', { error });

    // Throw to error boundary
    throw new Response('Failed to load', { status: 500 });
  }
}
```

### Client-Side Errors (Queries)

```typescript
const { data, error, isError } = useOrganizations();

if (isError) {
  return <ErrorMessage error={error} />;
}
```

### Global Error Boundary

React Router's error boundary catches unhandled errors:

```typescript
// app/root.tsx
export function ErrorBoundary() {
  const error = useRouteError();
  return <ErrorPage error={error} />;
}
```

---

## Related Documentation

- [Domain Modules](./domain-modules.md) - Resource module structure
- [GraphQL](./graphql.md) - GraphQL client architecture
- [Watch API](./watch-api.md) - Real-time implementation details
- [ADR-002](./adrs/002-domain-driven-resource-modules.md) - Module design decisions
- [ADR-008](./adrs/008-graphql-integration.md) - GraphQL integration decision
