# GraphQL Module

GraphQL client module for the Cloud Portal. Built on **[gqlts](https://github.com/remorses/genql)** (type-safe query builder) + **[URQL](https://formidable.com/open-source/urql/)** (executor and cache), with native SSR→CSR cache hydration so server-prefetched data is available instantly on first client render.

## Table of Contents

- [Architecture](#architecture)
- [Scopes](#scopes)
- [Quick Start](#quick-start)
  - [Reading data (CSR hook)](#reading-data-csr-hook)
  - [SSR prefetch in a loader](#ssr-prefetch-in-a-loader)
  - [Mutations (service layer)](#mutations-service-layer)
- [Multi-Scope Setup](#multi-scope-setup)
- [SSR → CSR Cache Hydration](#ssr--csr-cache-hydration)
- [API Reference](#api-reference)
- [Generated Types](#generated-types)
- [Error Handling](#error-handling)
- [File Reference](#file-reference)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Query builder: gqlts                                    │
│  Object syntax → { query: string, variables }           │
│  generateQueryOp / generateMutationOp                   │
└───────────────────────┬─────────────────────────────────┘
                        │ GraphqlOperation
                        ▼
┌─────────────────────────────────────────────────────────┐
│  URQL client (createGqlClient)                          │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │cacheExchange│ │ssrExchange │  │  fetchExchange   │   │
│  └───────────┘  └────────────┘  └──────────────────┘   │
│                                                         │
│  Server path: GRAPHQL_URL + scoped path + auth headers  │
│  Client path: /api/graphql/{scope}/{id} (Hono proxy)    │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
  SSR (loader)                 CSR (useQuery hook)
  prefetches data              reads from warm cache
  → urqlState in response      → no second network request
          │                            ▲
          └──── GraphQLProvider ───────┘
               (restores cache on mount)
```

**Key design decisions:**

- **gqlts stays as the code generator.** It generates the typed schema and `generateQueryOp`/`generateMutationOp` helpers. It does NOT execute requests.
- **URQL owns execution and cache.** `client.query(op.query, op.variables).toPromise()` replaces the old gqlts+axios executor.
- **REST (axios + TanStack Query) is completely separate.** This module is GraphQL-only.
- **Cache key = query string + variables.** The SSR loader and CSR hook must use identical `generateQueryOp` calls to guarantee a cache hit.

---

## Scopes

The GraphQL gateway exposes four scoped endpoints. Pick the one that matches the data you're accessing:

| Scope     | When to use                               | Server path                                                            | Client proxy                       |
| --------- | ----------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `user`    | User memberships, org list, user settings | `/iam.miloapis.com/v1alpha1/users/{userId}/graphql`                    | `/api/graphql/user/{userId}`       |
| `org`     | Resources within an organization          | `/resourcemanager.miloapis.com/v1alpha1/organizations/{orgId}/graphql` | `/api/graphql/org/{orgId}`         |
| `project` | Resources within a project                | `/resourcemanager.miloapis.com/v1alpha1/projects/{projectId}/graphql`  | `/api/graphql/project/{projectId}` |
| `global`  | Cross-org or admin operations             | `/graphql`                                                             | `/api/graphql`                     |

```typescript
import type { GqlScope } from '@/modules/graphql/client';

const userScope: GqlScope = { type: 'user', userId: 'me' }; // 'me' resolves on server
const orgScope: GqlScope = { type: 'org', orgId: 'my-org' };
const projectScope: GqlScope = { type: 'project', projectId: 'my-project' };
const globalScope: GqlScope = { type: 'global' };
```

---

## Quick Start

### Reading data (CSR hook)

Use URQL's `useQuery` with `generateQueryOp` to build a type-safe reactive hook.

```typescript
// app/resources/example/example.gql-queries.ts
import { generateQueryOp } from '@/modules/graphql/generated';
import type { QueryRequest } from '@/modules/graphql/generated';
import { useMemo } from 'react';
import { useQuery } from 'urql';

// Define at module level — computed once, not per render.
// This MUST match the SSR loader's generateQueryOp call exactly (same cache key).
const listOp = generateQueryOp({
  listMyResources: [
    {},
    {
      items: {
        metadata: { name: true, uid: true },
        spec: { displayName: true },
      },
    },
  ],
} satisfies QueryRequest);

export function useMyResources() {
  const [result, reexecute] = useQuery({
    query: listOp.query,
    variables: listOp.variables,
    requestPolicy: 'cache-first', // serve from SSR cache on first render
  });

  const items = useMemo(() => {
    return result.data?.listMyResources?.items ?? [];
  }, [result.data]);

  return {
    data: items,
    isLoading: result.fetching,
    error: result.error,
    refetch: () => reexecute({ requestPolicy: 'network-only' }),
  };
}
```

### SSR prefetch in a loader

Prefetch data server-side into an SSR exchange. The client restores this data from `<GraphQLProvider>` — no second network request on first render.

```typescript
// app/routes/example/index.tsx
import { createGqlClient } from '@/modules/graphql/client';
import { generateQueryOp } from '@/modules/graphql/generated';
import { createSsrExchange, extractSsrData } from '@/modules/graphql/ssr';
import { data } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ssr = createSsrExchange();
  const client = createGqlClient({ type: 'user', userId: 'me' }, ssr);

  // Must use the EXACT same generateQueryOp call as the CSR hook above.
  // Same field selection → same query string → same URQL cache key → cache hit.
  const op = generateQueryOp({
    listMyResources: [
      {},
      {
        items: {
          metadata: { name: true, uid: true },
          spec: { displayName: true },
        },
      },
    ],
  });

  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) {
    console.error('[SSR] prefetch failed:', result.error.message);
  }

  return data({ urqlState: extractSsrData(ssr) });
};
```

The loader returns `urqlState` — `root.tsx` collects it from all matched routes via `useMatches()` and passes it to `<GraphQLProvider>`.

### Mutations (service layer)

Mutations use the service layer with `generateMutationOp`. They don't need the SSR exchange.

```typescript
// app/resources/example/example.gql-service.ts
import { createGqlClient } from '@/modules/graphql/client';
import { generateMutationOp } from '@/modules/graphql/generated';
import type { MutationRequest } from '@/modules/graphql/generated';

export function createExampleGqlService() {
  return {
    async create(input: CreateInput): Promise<Example> {
      const client = createGqlClient({ type: 'org', orgId: input.orgId });
      const op = generateMutationOp({
        createMyResource: [
          { input: { spec: { displayName: input.displayName } } },
          { metadata: { name: true, uid: true } },
        ],
      } satisfies MutationRequest);

      const result = await client.mutation(op.query, op.variables).toPromise();
      if (result.error) throw mapApiError(result.error);

      return toExample(result.data!.createMyResource!);
    },
  };
}
```

Wrap the mutation in a TanStack Query `useMutation` hook. After success, call `refetch()` from the URQL list hook to refresh the cache:

```typescript
// app/resources/example/example.gql-queries.ts
import { useMutation } from '@tanstack/react-query';

export function useCreateExample(options) {
  return useMutation({
    mutationFn: (input) => createExampleGqlService().create(input),
    ...options,
  });
}
```

```tsx
// In a component
const { data, refetch } = useMyResources();
const { mutate: create } = useCreateExample({
  onSuccess: () => refetch(), // refresh URQL cache after mutation
});
```

---

## Multi-Scope Setup

The root `<GraphQLProvider>` in `root.tsx` is always **user-scoped**. It covers components that need user-level data (org list, user settings, etc.).

For org or project-scoped queries, add a nested `<GraphQLProvider>` that wraps **only the `<Outlet>`** inside the layout — not the `<DashboardLayout>` itself. The `<Header>` (with `<SelectOrganization>`) is rendered by `DashboardLayout` above `children`, so it always stays under the root user-scoped provider.

```tsx
// app/routes/org/detail/layout.tsx — correct placement
<DashboardLayout currentOrg={org} navItems={navItems}>
  {/* Header lives here, under root user-scoped provider ✅ */}

  <GraphQLProvider scope={{ type: 'org', orgId: org.name }} urqlState={urqlState}>
    {/* Org-scoped content — useQuery hooks here use the org client */}
    <RbacProvider ...>
      <Outlet />
    </RbacProvider>
  </GraphQLProvider>
</DashboardLayout>
```

```tsx
// app/routes/project/detail/layout.tsx
<DashboardLayout ...>
  <GraphQLProvider scope={{ type: 'project', projectId: project.name }} urqlState={urqlState}>
    <Outlet />
  </GraphQLProvider>
</DashboardLayout>
```

**Why this works:** URQL's nested `<Provider>` pattern means the innermost provider's client is used for all hooks within its subtree. Components outside (e.g. `<Header>`) still use the root provider.

> **Do NOT wrap `<DashboardLayout>` itself** with a scoped provider — the header's `SelectOrganization` uses `useOrganizationsGql()` which needs user scope.

---

## SSR → CSR Cache Hydration

```
Server                                Client
──────────────────────────────────    ─────────────────────────────────
1. loader runs                        4. React hydrates
   createSsrExchange()                   <GraphQLProvider urqlState={...}>
   createGqlClient(scope, ssr)              ssrExchange({ isClient: true,
   client.query(...).toPromise()  ──►        initialState: urqlState })
   extractSsrData(ssr)
   return { urqlState }              5. useQuery({ requestPolicy: 'cache-first' })
                                        → URQL finds data in ssrExchange
2. root.tsx useMatches()                → returns immediately, no fetch ✅
   merges urqlState from all
   matched routes

3. <GraphQLProvider urqlState={...}>
   passed to client
```

**Critical requirement:** The `generateQueryOp` call in the SSR loader and the CSR hook must be **byte-for-byte identical** (same field selection, same argument shape). URQL derives the cache key from the query document string — any difference means a cache miss.

---

## API Reference

### `createGqlClient(scope, ssr?)`

```typescript
import { createGqlClient } from '@/modules/graphql/client';
import type { GqlScope } from '@/modules/graphql/client';

const client = createGqlClient(scope, ssr?);
```

Creates a URQL client for the given scope.

- **Server:** hits `GRAPHQL_URL` directly with `Authorization` and `X-Request-ID` headers from `AsyncLocalStorage` (same request context as Axios).
- **Client:** routes through the Hono proxy at `/api/graphql/{scope}/{id}`, which injects auth from the session cookie.
- Pass an `ssrExchange` to capture results for SSR hydration.

---

### `<GraphQLProvider>`

```tsx
import { GraphQLProvider } from '@/modules/graphql/provider';

<GraphQLProvider scope={scope} urqlState={urqlState}>
  {children}
</GraphQLProvider>;
```

| Prop        | Type        | Default                          | Description                      |
| ----------- | ----------- | -------------------------------- | -------------------------------- |
| `scope`     | `GqlScope`  | `{ type: 'user', userId: 'me' }` | GraphQL endpoint scope           |
| `urqlState` | `SSRData`   | `undefined`                      | Serialized SSR cache from loader |
| `children`  | `ReactNode` | required                         |                                  |

Creates a URQL client once on mount. The client is scoped to the given endpoint. Restores SSR-prefetched data so CSR hooks get a cache hit on first render.

---

### `createSsrExchange()` / `extractSsrData(ssr)`

```typescript
import { createSsrExchange, extractSsrData } from '@/modules/graphql/ssr';

// In a loader:
const ssr = createSsrExchange();
const client = createGqlClient(scope, ssr);
await client.query(op.query, op.variables).toPromise();
return data({ urqlState: extractSsrData(ssr) });
```

`createSsrExchange()` returns a server-side URQL exchange that captures query results. `extractSsrData(ssr)` serializes the captured data into a JSON-serializable `SSRData` object to return from the loader.

---

### `generateQueryOp` / `generateMutationOp`

```typescript
import { generateQueryOp, generateMutationOp } from '@/modules/graphql/generated';

const op = generateQueryOp({ myQuery: [{}, { field: true }] });
// op.query    → GraphQL query string
// op.variables → typed variables object

await client.query(op.query, op.variables).toPromise();
```

These are generated by gqlts from the GraphQL schema. They convert the object-syntax field selection into a `{ query, variables }` pair that URQL can execute. Run `bun run graphql` to regenerate after schema changes.

---

### Error utilities

```typescript
import { isGqlError, getGqlErrorCode, getGqlErrorMessage } from '@/modules/graphql/errors';

// isGqlError: checks for gqlts-style { errors[] } response shape
// getGqlErrorCode: extracts extensions.code from a GraphQLError
// getGqlErrorMessage: extracts the first error message
```

For URQL `CombinedError` (the error type from `result.error` in hooks/services), use `mapApiError` from `@/utils/errors/error-mapper` — it handles `CombinedError` and maps `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, and `BAD_USER_INPUT` to the correct `AppError` subclass.

---

## Generated Types

The `generated/` directory is produced by `bun run graphql` and should not be edited manually.

Key exports used in query building:

```typescript
import type {
  QueryRequest,
  // type constraint for generateQueryOp input
  MutationRequest, // type constraint for generateMutationOp input
  // ... resource-specific request types for `satisfies` annotations
} from '@/modules/graphql/generated';
```

Always use `satisfies QueryRequest` / `satisfies MutationRequest` on the object you pass to `generateQueryOp` / `generateMutationOp` — this gives you compile-time validation that your field selection is schema-compatible.

---

## Error Handling

| Error source                  | Type                                  | How to handle                                                               |
| ----------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| URQL hook (`result.error`)    | `CombinedError`                       | Pass to `mapApiError()` — maps GraphQL error codes to `AppError` subclasses |
| URQL service (`.toPromise()`) | `CombinedError`                       | `if (result.error) throw mapApiError(result.error)`                         |
| SSR prefetch failure          | `CombinedError`                       | Log with `console.error`, continue — client will re-fetch                   |
| Network error                 | `CombinedError` (with `networkError`) | Handled by `mapApiError` fallback                                           |

`mapApiError` maps GraphQL error codes as follows:

| `extensions.code` | `AppError` subclass     |
| ----------------- | ----------------------- |
| `UNAUTHENTICATED` | `AuthenticationError`   |
| `FORBIDDEN`       | `AuthorizationError`    |
| `NOT_FOUND`       | `NotFoundError`         |
| `BAD_USER_INPUT`  | `ValidationError`       |
| anything else     | `AppError` (status 500) |

---

## File Reference

| File           | Purpose                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `client.ts`    | `createGqlClient(scope, ssr?)` — URQL client factory                     |
| `provider.tsx` | `<GraphQLProvider>` — React provider with SSR hydration                  |
| `ssr.ts`       | `createSsrExchange()`, `extractSsrData()` — SSR helpers                  |
| `types.ts`     | `GqlScope` type definition                                               |
| `endpoints.ts` | `buildScopedPath()`, `buildProxyPath()`, `parseScope()`                  |
| `errors.ts`    | `isGqlError()`, `getGqlErrorCode()`, `getGqlErrorMessage()`              |
| `generated/`   | Auto-generated schema types and `generateQueryOp` / `generateMutationOp` |
