# ADR-001: Express to Hono Migration

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

The cloud-portal was running on Express 5.1.0 with a custom middleware chain. While Express is mature and well-documented, it introduced several challenges:

1. **Bundle size** - Express and its ecosystem added ~300KB+ to the bundle
2. **Bun compatibility** - Express requires an adapter layer for Bun runtime
3. **BFF complexity** - 40+ API routes acting as a Backend-for-Frontend
4. **Middleware overhead** - Custom middleware for rate limiting, logging, etc.

With the move to Bun as our runtime and the desire to simplify the data layer, we needed a server framework that was lightweight, Bun-native, and aligned with modern patterns.

## Decision

Replace Express with Hono, using `react-router-hono-server` for integration with React Router v7.

### Technical Details

**New server structure:**

```
app/server/
├── entry.ts              # Main Hono app
├── types.ts              # Server types
├── middleware/
│   ├── auth.ts           # Authentication
│   ├── context.ts        # Request context (clients, cache)
│   ├── error-handler.ts  # Global error handling
│   ├── logger.ts         # Request/response logging
│   ├── rate-limit.ts     # Rate limiting
│   └── sentry-tracing.ts # Sentry performance
└── routes/
    ├── index.ts          # Route registration
    ├── activity.ts       # Activity logs
    ├── cloudvalid.ts     # CloudValid DNS check
    ├── grafana.ts        # Grafana proxy
    ├── notifications.ts  # Notification polling
    ├── permissions.ts    # RBAC checks
    ├── prometheus.ts     # Prometheus proxy
    └── user.ts           # User CRUD
```

### Before vs After

| Aspect | Before (Express) | After (Hono) |
|--------|------------------|--------------|
| Framework size | ~200KB | ~14KB |
| Bun support | Via adapter | Native |
| Route files | 40+ in `routes/api/` | 10 in `server/routes/` |
| Middleware | Express-style | Hono middleware (composable) |
| Type safety | Manual | Built-in with TypeScript |
| Error handling | Try-catch per route | Global error handler |

## Rationale

Hono was chosen because:

1. **Lightweight** - 14KB vs 200KB+ for Express
2. **Bun-native** - No adapter layer needed
3. **TypeScript-first** - Better DX with type inference
4. **Compatible** - `react-router-hono-server` provides seamless integration
5. **Modern patterns** - Composable middleware, Web Standard APIs

## Alternatives Considered

### Option A: Keep Express

- **Pros:** No migration effort, team familiarity
- **Cons:** Bundle bloat, adapter overhead, dated patterns
- **Why rejected:** Doesn't align with Bun-native goals

### Option B: Fastify

- **Pros:** Fast, good TypeScript support
- **Cons:** Larger than Hono, less Bun-native
- **Why rejected:** Hono is more lightweight and Bun-optimized

### Option C: Elysia

- **Pros:** Bun-native, very fast
- **Cons:** Less mature, smaller ecosystem
- **Why rejected:** `react-router-hono-server` provides better React Router integration

## Consequences

### Positive

- ~93% reduction in server framework size (200KB → 14KB)
- Native Bun support without adapters
- Cleaner middleware composition
- Better TypeScript integration
- Simplified error handling

### Negative

- Team needs to learn Hono patterns
- Some Express middleware packages need replacement
- Migration effort for existing middleware

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Team unfamiliarity with Hono | Documentation, code examples, similar to Express patterns |
| Missing middleware packages | Hono has equivalents for most common middleware |
| React Router integration issues | `react-router-hono-server` is actively maintained |

## References

- [Hono Documentation](https://hono.dev/)
- [react-router-hono-server](https://github.com/rphlmr/react-router-hono-server)
- [ADR-002: Domain Modules](./002-domain-driven-resource-modules.md) - Eliminates need for most BFF routes
