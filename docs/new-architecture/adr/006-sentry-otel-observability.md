# ADR-006: Sentry + OTEL Observability

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

The application had separate observability systems:

1. **Sentry** - Error tracking with basic context
2. **OpenTelemetry** - Distributed tracing
3. **Prometheus** - Metrics collection
4. **Logger** - Application logs

These systems operated independently:

- Sentry errors had no trace IDs
- OTEL traces couldn't link to Sentry issues
- Debugging required checking multiple dashboards
- Request correlation was manual

## Decision

Integrate Sentry with OpenTelemetry to correlate errors with distributed traces, providing a unified observability experience.

### Technical Details

**Enhanced Sentry provider:**

```
observability/providers/
├── otel.ts      # OpenTelemetry setup
└── sentry.ts    # Sentry with OTEL integration
```

**Key integrations:**

1. **Trace correlation** - Sentry events include OTEL trace_id and span_id
2. **Server integrations** - HTTP, fetch, request data capture
3. **Header redaction** - Sensitive headers (authorization, cookie) redacted
4. **Logger breadcrumbs** - Log messages appear in Sentry timeline

**Middleware enhancement:**

```typescript
// Logger middleware extracts OTEL context
const span = trace.getActiveSpan();
const traceId = span?.spanContext().traceId;
const spanId = span?.spanContext().spanId;
```

### Before vs After

| Aspect             | Before        | After                    |
| ------------------ | ------------- | ------------------------ |
| Error → Trace link | None          | One click (trace_id)     |
| Request context    | Basic         | Full (headers, body, IP) |
| Sensitive data     | Exposed       | Redacted automatically   |
| Log → Sentry link  | None          | Breadcrumbs in timeline  |
| Debugging workflow | 3+ dashboards | Unified view             |

## Rationale

Sentry + OTEL integration was chosen because:

1. **Unified debugging** - Click from error to trace to logs
2. **Full context** - Request data captured automatically
3. **Security** - Automatic header redaction
4. **Standard** - OTEL is industry standard for tracing
5. **Existing investment** - Already using both systems

## Alternatives Considered

### Option A: Keep Separate

- **Pros:** No integration effort
- **Cons:** Manual correlation, multiple dashboards
- **Why rejected:** Debugging was too slow

### Option B: Use Sentry Performance Only

- **Pros:** Single system, simpler
- **Cons:** Lose OTEL ecosystem (Jaeger, custom spans)
- **Why rejected:** OTEL is more flexible

### Option C: Replace Sentry with OTEL-native

- **Pros:** Pure OTEL stack
- **Cons:** Lose Sentry's error analysis features
- **Why rejected:** Sentry provides better error UX

## Consequences

### Positive

- One requestId + traceId across all systems
- Click from Sentry error to OTEL trace
- Automatic breadcrumbs from logger
- Sensitive data protected by default
- Better debugging experience

### Negative

- More complex Sentry initialization
- OTEL dependency required
- Slight performance overhead (context extraction)

### Risks & Mitigations

| Risk                  | Mitigation                             |
| --------------------- | -------------------------------------- |
| OTEL context missing  | Fallback to Sentry propagation context |
| Performance overhead  | Minimal (context extraction is fast)   |
| Header redaction gaps | Explicit allow-list for safe headers   |

## References

- [Sentry OTEL Integration](https://docs.sentry.io/platforms/javascript/guides/node/performance/instrumentation/opentelemetry/)
- [OpenTelemetry JS](https://opentelemetry.io/docs/js/)
- [ADR-004: Structured Logger](./004-structured-logger-module.md) - Logger provides breadcrumbs
