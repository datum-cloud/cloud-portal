# ADR-004: Structured Logger Module

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

Logging in the application was inconsistent:

1. **console.log everywhere** - No structure, hard to parse
2. **Morgan for HTTP** - Separate from application logs
3. **No request correlation** - Couldn't trace requests across systems
4. **Manual debugging** - Developers had to reconstruct API calls manually

When debugging issues, developers would:

- Search through unstructured console output
- Manually construct curl commands to reproduce API calls
- Lose context when requests spanned multiple services

## Decision

Create a centralized logger module with structured output, request correlation, and automatic CURL generation for debugging.

### Technical Details

**Logger module structure:**

```
app/modules/logger/
├── logger.ts           # Main logger with levels
├── logger.config.ts    # Environment-based configuration
├── formatters/
│   ├── terminal.ts     # Colored output for development
│   └── json.ts         # Structured JSON for production
├── integrations/
│   ├── sentry.ts       # Breadcrumbs and error capture
│   └── curl.ts         # CURL command generation
└── index.ts
```

**Features:**

- Log levels: debug, info, warn, error
- Request correlation: requestId, traceId, spanId
- Environment-aware formatting (terminal vs JSON)
- Automatic CURL generation in development
- Sentry integration for breadcrumbs
- Token redaction in production

### Before vs After

| Aspect              | Before                   | After                      |
| ------------------- | ------------------------ | -------------------------- |
| Log format          | Unstructured console.log | Structured with levels     |
| Request correlation | None                     | requestId, traceId, spanId |
| API debugging       | Manual curl construction | Auto-generated CURL        |
| Production logs     | Plain text               | JSON (Loki-friendly)       |
| Error tracking      | Manual Sentry calls      | Automatic breadcrumbs      |

## Rationale

A centralized logger was chosen because:

1. **Consistency** - Same format everywhere
2. **Correlation** - Trace requests across systems
3. **DX** - CURL generation speeds up debugging
4. **Observability** - Integrates with OTEL, Sentry, Loki
5. **Security** - Automatic token redaction

## Alternatives Considered

### Option A: Keep console.log

- **Pros:** No changes needed
- **Cons:** No structure, no correlation, hard to debug
- **Why rejected:** Debugging production issues was painful

### Option B: Use Pino/Winston

- **Pros:** Mature libraries, many features
- **Cons:** Heavy dependencies, not optimized for Bun
- **Why rejected:** Wanted lightweight, custom solution

### Option C: Use console with wrapper

- **Pros:** Simple, familiar API
- **Cons:** Limited customization
- **Why rejected:** Needed more features (CURL, Sentry)

## Consequences

### Positive

- Consistent log format across application
- Request correlation for tracing
- Faster debugging with CURL generation
- Production-ready JSON output
- Automatic Sentry breadcrumbs

### Negative

- Custom solution to maintain
- Team needs to use logger instead of console
- Additional abstraction layer

### Risks & Mitigations

| Risk                  | Mitigation                          |
| --------------------- | ----------------------------------- |
| Team uses console.log | ESLint rule, code review            |
| Performance overhead  | Lazy evaluation, skip in production |
| CURL leaks secrets    | Redaction in production mode        |

## References

- [ADR-006: Sentry + OTEL](./006-sentry-otel-observability.md) - Logger integrates with Sentry
