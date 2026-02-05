# GraphQL Integration

This document describes the GraphQL client architecture using Gqlts for type-safe GraphQL queries.

---

## Overview

The portal supports GraphQL as an alternative to REST for data fetching. GraphQL is implemented using [Gqlts](https://gqlts.vercel.app/), a type-safe GraphQL client that provides:

- **Type-safe queries** - Full TypeScript support with autocompletion
- **Object syntax** - No string-based queries, just TypeScript objects
- **Universal client** - Works in both browser and server (SSR)
- **Built-in Axios** - Integrates with our centralized HTTP handling

### When to Use GraphQL vs REST

| Use Case            | Recommended  | Why                                 |
| ------------------- | ------------ | ----------------------------------- |
| Complex nested data | GraphQL      | Single request, select exact fields |
| Simple CRUD         | REST         | Simpler, well-established patterns  |
| Real-time updates   | REST + Watch | K8s Watch API via SSE               |
| Batch operations    | GraphQL      | Multiple operations in one request  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  Component                                                       │
│      │                                                           │
│      ▼                                                           │
│  React Query Hook (useOrganizationsGql)                          │
│      │                                                           │
│      ▼                                                           │
│  GQL Service (organization.gql-service.ts)                       │
│      │                                                           │
│      ▼                                                           │
│  Gqlts Client (client.ts)                                        │
│      │                                                           │
│      ▼                                                           │
│  Axios (httpClient) ──────► /api/graphql/{scope}/{id}           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Server (SSR/Proxy)                        │
├─────────────────────────────────────────────────────────────────┤
│  Loader / GraphQL Proxy                                          │
│      │                                                           │
│      ▼                                                           │
│  Gqlts Client (client.ts)                                        │
│      │                                                           │
│      ▼                                                           │
│  Axios (http) with interceptors                                  │
│      │  - Auth injection from AsyncLocalStorage                  │
│      │  - X-Request-ID for tracing                               │
│      │  - Curl logging (when enabled)                            │
│      │                                                           │
│      ▼                                                           │
│  GraphQL Gateway (GRAPHQL_URL)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
app/modules/gqlts/
├── client.ts           # Universal client (routes based on environment)
├── endpoints.ts        # URL builders for scoped endpoints
├── errors.ts           # GraphQL error handling
├── types.ts            # GqlScope type definition
└── generated/          # Gqlts generated client
    ├── index.js        # Client factory
    ├── index.d.ts      # TypeScript definitions
    ├── schema.ts       # Type definitions from schema
    ├── types.esm.js    # Runtime type mappings
    ├── guards.esm.js   # Type guards
    └── schema.graphql  # GraphQL schema
```

---

## Scoped Endpoints

GraphQL endpoints are scoped to different contexts:

| Scope        | Server Path                                                            | Client Proxy Path                  |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------- |
| User         | `/iam.miloapis.com/v1alpha1/users/{userId}/graphql`                    | `/api/graphql/user/{userId}`       |
| Organization | `/resourcemanager.miloapis.com/v1alpha1/organizations/{orgId}/graphql` | `/api/graphql/org/{orgId}`         |
| Project      | `/resourcemanager.miloapis.com/v1alpha1/projects/{projectId}/graphql`  | `/api/graphql/project/{projectId}` |
| Global       | `/graphql`                                                             | `/api/graphql`                     |

### Scope Type Definition

```typescript
// app/modules/gqlts/types.ts
export type GqlScope =
  | { type: 'user'; userId: string }
  | { type: 'org'; orgId: string }
  | { type: 'project'; projectId: string }
  | { type: 'global' };
```

---

## Client Usage

### Creating a Client

```typescript
import { createGqlClient } from '@/modules/gqlts/client';

// User-scoped client (use 'me' for current user)
const userClient = createGqlClient({ type: 'user', userId: 'me' });

// Organization-scoped client
const orgClient = createGqlClient({ type: 'org', orgId: 'my-org' });

// Project-scoped client
const projectClient = createGqlClient({ type: 'project', projectId: 'my-project' });

// Global client
const globalClient = createGqlClient({ type: 'global' });
```

### Query Example

```typescript
const result = await client.query({
  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces: [
    {}, // variables (empty for list all)
    {
      // field selection
      items: {
        metadata: { uid: true, name: true, namespace: true },
        spec: { organizationRef: { name: true } },
        status: { organization: { displayName: true, type: true } },
      },
      metadata: { continue: true },
    },
  ],
});

const items =
  result.data?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces?.items;
```

### Mutation Example

```typescript
const result = await client.mutation({
  createResourcemanagerMiloapisComV1alpha1Organization: [
    {
      input: {
        metadata: { name: 'my-org' },
        spec: { type: 'Team' },
      },
    },
    {
      metadata: { uid: true, name: true },
      spec: { type: true },
    },
  ],
});

const created = result.data?.createResourcemanagerMiloapisComV1alpha1Organization;
```

---

## Environment Detection

The client automatically detects the environment and routes requests appropriately:

```typescript
// app/modules/gqlts/client.ts
export function createGqlClient(scope: GqlScope) {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // Direct API access with auth from AsyncLocalStorage
    const url = `${process.env.GRAPHQL_URL}${buildScopedPath(scope)}`;
    return createGqltsClient({ url, fetcherInstance: http });
  }

  // Client: Route through proxy
  const path = buildProxyPath(scope);
  return createGqltsClient({ url: path, baseURL: '', fetcherInstance: httpClient });
}
```

---

## Axios Integration

Gqlts uses Axios internally. We pass our configured Axios instances to centralize HTTP handling:

### Server-Side (`http` from axios.server.ts)

- Auto-injects `Authorization` header from AsyncLocalStorage
- Auto-injects `X-Request-ID` for tracing
- Curl command logging (when `LOGGER_CONFIG.logCurl` is enabled)
- Standardized error mapping to AppError classes

### Client-Side (`httpClient` from axios.client.ts)

- Session cookie authentication (via proxy)
- 401 handling with redirect to `/logout`
- Sentry error capture

---

## GraphQL Proxy

The server provides a GraphQL proxy for client-side requests:

```typescript
// app/server/routes/graphql.ts
graphqlRouter.post('/:scopeType/:scopeId', async (c) => {
  const { scopeType, scopeId } = c.req.param();
  const session = c.get('session');

  // Resolve 'me' to actual user ID
  const resolvedScopeId = scopeType === 'user' && scopeId === 'me' ? session.sub : scopeId;

  const scope = parseScope(scopeType, resolvedScopeId);
  const targetUrl = buildScopedEndpoint(env.public.graphqlUrl, scope);

  // Forward request to GraphQL gateway
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(await c.req.json()),
  });

  return c.json(await response.json());
});
```

---

## Service Pattern

GraphQL services follow the same pattern as REST services:

```
app/resources/{resource}/
├── {resource}.schema.ts        # Zod schemas (shared with REST)
├── {resource}.adapter.ts       # API → Domain transforms (shared)
├── {resource}.service.ts       # REST service
├── {resource}.gql-service.ts   # GraphQL service (NEW)
├── {resource}.queries.ts       # REST React Query hooks
├── {resource}.gql-queries.ts   # GraphQL React Query hooks (NEW)
└── index.ts                    # Public exports
```

### GraphQL Service Example

```typescript
// organization.gql-service.ts
import { toOrganizationFromMembership } from './organization.adapter';
import { createGqlClient } from '@/modules/gqlts/client';

export function createOrganizationGqlService() {
  return {
    async list() {
      const client = createGqlClient({ type: 'user', userId: 'me' });

      const result = await client.query({
        listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces: [
          {},
          {
            items: {
              metadata: { uid: true, name: true, namespace: true },
              spec: { organizationRef: { name: true } },
              status: { organization: { displayName: true, type: true } },
            },
          },
        ],
      });

      const items =
        result.data?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces
          ?.items ?? [];
      return items.map(toOrganizationFromMembership);
    },
  };
}
```

---

## Code Generation

### Generating the Client

```bash
bun run graphql
```

This runs `scripts/graphql.ts` which:

1. Fetches the schema from the GraphQL gateway
2. Filters to include only needed types (reduces bundle size)
3. Generates the Gqlts client

### Configuration

```json
// graphql.config.json
{
  "schema": "https://graphql.staging.env.datum.net/graphql",
  "generates": {
    "app/modules/gqlts/generated": {
      "plugins": ["typescript", "typescript-operations"]
    }
  }
}
```

---

## Environment Variables

| Variable      | Description         | Example                                 |
| ------------- | ------------------- | --------------------------------------- |
| `GRAPHQL_URL` | GraphQL gateway URL | `https://graphql.staging.env.datum.net` |

Add to `.env`:

```
GRAPHQL_URL=https://graphql.staging.env.datum.net
```

---

## Related Documentation

- [Data Flow](./data-flow.md) - Request lifecycle overview
- [Domain Modules](./domain-modules.md) - Resource module structure
- [ADR-008: GraphQL Integration](./adrs/008-graphql-integration.md) - Design decision
