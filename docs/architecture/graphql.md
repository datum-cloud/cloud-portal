# GraphQL Integration

This document describes how the portal talks to the GraphQL gateway. The module lives in `app/modules/graphql/`; its [README](../../app/modules/graphql/README.md) has the full API reference.

---

## Overview

Most resources use the generated REST clients in `app/modules/control-plane/`. A few use GraphQL, built from two libraries:

- **[Gqlts](https://gqlts.vercel.app/)** generates the schema types and the `generateQueryOp` / `generateMutationOp` builders. Requests are written as TypeScript objects, so field selections are type-checked.
- **URQL** (`@urql/core`) sends the request and holds the SSR hydration cache.

The Gqlts runtime client and Axios are not used for GraphQL transport. `createGqlClient` returns a URQL client that calls `fetch`.

### Where GraphQL is used today

| Resource      | Files                                                                                   | Operations                                    |
| ------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| Organizations | `organization.gql-service.ts`, `organization.gateway.ts`, `organization.gql-queries.ts` | Membership list, read, create, update, delete |
| Users         | `user.gql-service.ts`, `user.gql-queries.ts`                                            | Active sessions list, revoke session          |

Everything else goes through REST, and real-time updates use the Watch API (see [Watch API](./watch-api.md)).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  Component                                                       │
│      │                                                           │
│      ▼                                                           │
│  TanStack Query hook (useCreateOrganizationGql)                  │
│      │                                                           │
│      ▼                                                           │
│  GQL service (organization.gql-service.ts)                       │
│      │                                                           │
│      ▼                                                           │
│  runGqlQuery / runGqlMutation (client.ts)                        │
│      │                                                           │
│      ▼                                                           │
│  URQL client, fetch = gatedFetch ──► /api/graphql/{scope}/{id}   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Server (SSR/Proxy)                        │
├─────────────────────────────────────────────────────────────────┤
│  Loader (SSR)                    Hono proxy (/api/graphql)       │
│      │                               │                           │
│      ▼                               ▼                           │
│  URQL client, fetch adds:        forwardGraphql adds:            │
│   - Authorization (request ctx)   - Authorization (session)      │
│   - X-Request-ID                  - X-Request-ID                 │
│   - User-Agent                    - sentry-trace, baggage        │
│      │                            - User-Agent                   │
│      │                               │                           │
│      └──────────────┬────────────────┘                           │
│                     ▼                                            │
│           GraphQL Gateway (GRAPHQL_URL)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
app/modules/graphql/
├── client.ts           # createGqlClient, runGqlQuery, runGqlMutation
├── endpoints.ts        # parseScope, buildScopedPath, buildProxyPath
├── errors.ts           # isGqlError, getGqlErrorCode, getGqlErrorMessage
├── provider.tsx        # <GraphQLProvider> (URQL provider with SSR hydration)
├── ssr.ts              # createSsrExchange, extractSsrData
├── types.ts            # GqlScope type definition
├── README.md           # API reference
└── generated/          # Gqlts output, do not edit by hand
    ├── index.js        # generateQueryOp / generateMutationOp
    ├── index.d.ts      # TypeScript definitions
    ├── schema.ts       # Type definitions from the filtered schema
    ├── types.esm.js    # Runtime type mappings
    ├── guards.esm.js   # Type guards
    └── schema.graphql  # Filtered GraphQL schema
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

The server path is appended to `GRAPHQL_URL` (`buildScopedPath`). The proxy path is what the browser calls (`buildProxyPath`).

### Scope Type Definition

```typescript
// app/modules/graphql/types.ts
export type GqlScope =
  | { type: 'user'; userId: string }
  | { type: 'org'; orgId: string }
  | { type: 'project'; projectId: string }
  | { type: 'global' };
```

`userId: 'me'` means the current user. On the server `createGqlClient` resolves it from the request context; in the browser the proxy resolves it from the session.

---

## Client Usage

### Running a query or mutation

Services call `runGqlQuery` and `runGqlMutation`. Both take an operation name, a Gqlts request object and a scope:

```typescript
import { runGqlQuery } from '@/modules/graphql/client';

const result = await runGqlQuery(
  'OrganizationMemberships', // operation name, required
  {
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
  },
  { type: 'user', userId: 'me' }
);

const items =
  result?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces?.items;
```

The helpers:

- name every operation, so none reaches the gateway as `Anonymous`
- return the data typed from the field selection, or `null` when there is no data
- throw the error mapped by `mapApiError`, with the request id, when the result has an error

They are the only callers of `generateQueryOp` and `generateMutationOp`.

```typescript
import { runGqlMutation } from '@/modules/graphql/client';

const result = await runGqlMutation(
  'OrganizationCreate',
  {
    createResourcemanagerMiloapisComV1alpha1Organization: [
      { input: { metadata: { name: 'my-org' }, spec: { type: 'Standard' } } },
      { metadata: { uid: true, name: true }, spec: { type: true } },
    ],
  },
  { type: 'global' }
);

const created = result?.createResourcemanagerMiloapisComV1alpha1Organization;
```

### Creating a client directly

`createGqlClient(scope, ssr?)` returns the URQL client for a scope. Use it when the helpers do not fit, for example a hand-built query string against the global gateway (`organization.gateway.ts`) or a loader that prefetches for SSR hydration:

```typescript
import { createGqlClient } from '@/modules/graphql/client';

const client = createGqlClient({ type: 'global' });
const response = await client.query(query, {}).toPromise();
if (response.error) throw mapApiError(response.error);
```

---

## Environment Detection

`createGqlClient` picks the target from the runtime:

```typescript
// app/modules/graphql/client.ts (shortened)
export function createGqlClient(scope: GqlScope, ssr?: SSRExchange): UrqlClient {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const ctx = getRequestContext();
    // 'me' is resolved to ctx.userId here
    const url = `${env.public.graphqlUrl}${buildScopedPath(resolvedScope)}`;
    return createClient({
      url,
      preferGetMethod: false,
      exchanges: [cacheExchange, ...(ssr ? [ssr] : []), fetchExchange],
      fetch: buildAuthFetch(ctx?.token, ctx?.requestId, ctx?.userAgent),
    });
  }

  return createClient({
    url: buildProxyPath(scope),
    preferGetMethod: false,
    exchanges: [cacheExchange, ...(ssr ? [ssr] : []), fetchExchange],
    fetch: gatedFetch,
  });
}
```

- **Server**: calls the gateway directly. The token, request id and user agent come from the request context in `AsyncLocalStorage`.
- **Browser**: calls the `/api/graphql` proxy, which authenticates with the session cookie. `gatedFetch` (`@/modules/rate-limit`) fails fast while the client is backing off after a 429.
- `preferGetMethod: false` is required because `@urql/core` v6 defaults to GET and the gateway needs POST.

---

## GraphQL Proxy

`app/server/routes/graphql.ts` is mounted at `/api/graphql` and has two routes:

| Route                              | Target                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `/api/graphql/:scopeType/:scopeId` | `GRAPHQL_URL` + scoped path (`user` `me` → `session.sub`) |
| `/api/graphql`                     | `GRAPHQL_URL/graphql`                                     |

Both return 401 without a session and forward through `forwardGraphql`, which:

- sends the session access token, `X-Request-ID`, the browser `User-Agent` and the Sentry `sentry-trace` / `baggage` headers
- cancels the upstream request when the browser disconnects (the route answers 499)
- retries a 401 once with the session a concurrent refresh rotated to, and returns the new cookies
- passes the gateway's status and JSON body back unchanged

An unknown scope type returns 400. Any other failure returns 502.

---

## SSR Hydration

`<GraphQLProvider>` wraps the app in `app/root.tsx` with a user-scoped URQL client. A loader can prefetch with `createSsrExchange()` and return `urqlState: extractSsrData(ssr)`. `root.tsx` merges `urqlState` from every matched route into the provider, so URQL hooks start from a cache hit. Nest another `<GraphQLProvider scope={...}>` to give a subtree an org or project scope.

No component uses URQL hooks at the moment. The existing GraphQL hooks are TanStack Query hooks over the services, as shown below. See the module README for the URQL hook and loader examples.

---

## Service Pattern

GraphQL services sit next to the REST files in the resource module and reuse its schema, adapter and query keys:

```
app/resources/organizations/
├── organization.schema.ts        # Zod schemas (shared with REST)
├── organization.adapter.ts       # API → domain transforms (shared)
├── organization.service.ts       # REST service + organizationKeys
├── organization.gql-service.ts   # GraphQL service
├── organization.gateway.ts       # Global-gateway queries (list with member avatars)
├── organization.queries.ts       # REST TanStack Query hooks
├── organization.gql-queries.ts   # GraphQL TanStack Query hooks
└── index.ts                      # Public exports
```

### GraphQL Service Example

```typescript
// organization.gql-service.ts (shortened)
import { toOrganizationFromMembership } from './organization.adapter';
import { runGqlQuery } from '@/modules/graphql/client';
import type { com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest } from '@/modules/graphql/generated';

export function createOrganizationGqlService() {
  return {
    async list() {
      const result = await runGqlQuery(
        'OrganizationMemberships',
        {
          listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces: [
            {},
            {
              items: {
                metadata: { uid: true, name: true, namespace: true },
                spec: { organizationRef: { name: true } },
                status: { organization: { displayName: true, type: true } },
              },
            } satisfies com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest,
          ],
        },
        { type: 'user', userId: 'me' }
      );

      const items =
        result?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces
          ?.items ?? [];
      return items.filter((item) => item !== null).map(toOrganizationFromMembership);
    },
  };
}
```

`satisfies <Type>Request` on the selection catches a misspelled field at compile time.

### Hook Example

```typescript
// organization.gql-queries.ts
export function useCreateOrganizationGql(
  options?: UseMutationOptions<Organization, Error, CreateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => createOrganizationGqlService().create(input),
    ...options,
    onSuccess: (...args) => {
      const [newOrg] = args;
      queryClient.setQueryData(organizationKeys.detail(newOrg.name), newOrg);
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
```

GraphQL and REST hooks share `organizationKeys`, so either can update or invalidate the other's cache.

---

## Code Generation

```bash
pnpm graphql           # generate from graphql.config.json
pnpm graphql -i        # interactive: change the selected operations
pnpm graphql --reset   # clear the config and start again
```

`scripts/graphql.ts`:

1. Introspects the gateway schema at the `url` in `graphql.config.json`
2. Keeps only the listed queries and mutations plus the types they need
3. Runs the `@gqlts/cli` generator into `app/modules/graphql/generated/`

### Configuration

`graphql.config.json` lists the operations to generate. Add an operation name here, then run `pnpm graphql`:

```json
{
  "url": "https://graphql.staging.env.datum.net/graphql",
  "queries": [
    "listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces",
    "readResourcemanagerMiloapisComV1alpha1Organization",
    "sessions"
  ],
  "mutations": [
    "createResourcemanagerMiloapisComV1alpha1Organization",
    "patchResourcemanagerMiloapisComV1alpha1Organization",
    "deleteResourcemanagerMiloapisComV1alpha1Organization",
    "deleteSession"
  ]
}
```

---

## Environment Variables

| Variable      | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `GRAPHQL_URL` | GraphQL gateway base URL. Scoped paths and `/graphql` are appended to it. |

It is read through `env.public.graphqlUrl` (`app/utils/env`). See `.env.example` for the local value.

---

## Related Documentation

- [GraphQL module README](../../app/modules/graphql/README.md) - API reference, SSR and multi-scope examples
- [Data Flow](./data-flow.md) - Request lifecycle overview
- [Domain Modules](./domain-modules.md) - Resource module structure
- [ADR-008: GraphQL Integration](./adrs/008-graphql-integration.md) - Original design decision. It predates the move from the Gqlts Axios client to URQL.
