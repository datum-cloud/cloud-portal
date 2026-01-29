# ADR-008: GraphQL Integration with Gqlts

## Status

Accepted

## Context

The portal primarily uses REST APIs via generated clients from OpenAPI specs. However, some use cases benefit from GraphQL:

1. **Complex nested data** - Organization memberships require fetching user, org, and role data
2. **Field selection** - REST returns full objects; GraphQL returns only requested fields
3. **Reduced requests** - Multiple related resources in a single query

We initially tried [Graffle](https://graffle.js.org/), but its dependency chain (`@wollybeard/kit` → `ts-morph` → `createRequire`) uses Node.js-only APIs that don't work in browsers.

## Decision

Adopt **Gqlts** (a fork of Genql) as the GraphQL client because:

1. **Browser + Node.js support** - Explicitly designed for both environments
2. **Object syntax** - Type-safe queries without string templates
3. **Built-in Axios** - Integrates with our existing HTTP infrastructure
4. **Small bundle** - 228KB vs 1.5MB for Graffle (filtered schema)

### Architecture

```
Browser                          Server
   │                                │
   ▼                                ▼
createGqlClient()               createGqlClient()
   │                                │
   ▼                                ▼
httpClient (axios.client)       http (axios.server)
   │                                │
   ▼                                ▼
/api/graphql/{scope}            GRAPHQL_URL/{scope}
   │                                │
   └────────► GraphQL Gateway ◄─────┘
```

### Key Design Choices

1. **Shared Axios via globalThis** - Axios instances registered on `globalThis` for cross-module access without import issues
2. **Scoped endpoints** - User/Org/Project/Global scopes mirror REST API structure
3. **Proxy for client** - Browser requests go through `/api/graphql` proxy for auth handling
4. **'me' resolution** - `users/me` resolved to actual user ID from session context

## Consequences

### Positive

- Type-safe GraphQL with full IDE support
- Reduced bundle size compared to Graffle
- Works in both SSR and client-side
- Shares cache with REST via same query keys
- Centralized HTTP handling (logging, errors, auth)

### Negative

- Two data fetching patterns to maintain (REST + GraphQL)
- Generated client needs regeneration when schema changes
- globalThis pattern is implicit (not type-safe)

### Risks

- Schema drift between REST and GraphQL endpoints
- Maintenance burden of dual implementations

## Alternatives Considered

### 1. Graffle

**Rejected** - Node.js-only dependencies break browser builds

### 2. urql / Apollo Client

**Rejected** - String-based queries, larger bundle, less type safety

### 3. REST Only

**Rejected** - Some use cases genuinely benefit from GraphQL's field selection and nesting

### 4. GraphQL Only

**Rejected** - REST is well-established, Watch API uses REST, migration risk too high

## Implementation

See [GraphQL Architecture](../graphql.md) for implementation details.

### Files Created

```
app/modules/gqlts/
├── client.ts           # Universal client
├── endpoints.ts        # URL builders
├── errors.ts           # Error handling
├── types.ts            # GqlScope type
└── generated/          # Generated client

app/server/routes/graphql.ts    # GraphQL proxy
```

### Environment

```
GRAPHQL_URL=https://graphql.staging.env.datum.net
```

## References

- [Gqlts Documentation](https://gqlts.vercel.app/)
- [Migration Design](../../plans/2025-01-29-gqlts-migration-design.md)
