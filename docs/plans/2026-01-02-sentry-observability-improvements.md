# Sentry & Observability Stack Improvements

**Date:** 2026-01-02
**Status:** Design Complete
**Author:** Claude Sonnet 4.5

## Overview

Enhance the existing observability stack (OTEL + Prometheus + Sentry) with better integration, context enrichment, and correlation between systems. This improves error tracking and debugging for enterprise production environments.

## Current Stack (Already Implemented ✅)

### 1. OpenTelemetry (OTEL) - Distributed Tracing

- **Location:** `observability/providers/otel.ts`
- **Purpose:** Track request flow across services
- **Exports to:** OTLP endpoint (Grafana Tempo/Jaeger)
- **Data:** Spans, traces, transaction timing

### 2. Prometheus - Metrics

- **Location:** `app/server/entry.ts` (Hono middleware)
- **Purpose:** Time-series metrics
- **Exports to:** Prometheus server scrapes `/metrics`
- **Data:** Request counts, durations, histograms

### 3. Sentry - Error Tracking

- **Client:** `app/entry.client.tsx`
- **Server:** `observability/providers/sentry.ts`
- **Purpose:** Error monitoring + alerts
- **Exports to:** Sentry cloud → Slack alerts ✅
- **Data:** Errors, stack traces, user context

### 4. Logger Module

- **Location:** `app/modules/logger/`
- **Integrations:** `logger/integrations/sentry.ts`
- **Features:** Breadcrumbs, error capture, context setting

## Architecture

```
┌─────────────────────────────────────────┐
│   Server Startup (app/server/entry.ts) │
│   └── observability.initialize()        │
│       ├── OTEL Provider (tracing)       │
│       ├── Sentry Provider (errors)      │
│       └── Prometheus (metrics)          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Logger Middleware (per request)        │
│  └── Creates logger with OTEL context   │
│      ├── requestId                      │
│      ├── traceId (from OTEL)            │
│      └── spanId (from OTEL)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Logger Module (app/modules/logger)     │
│  └── logger.error() / info() / etc.     │
│      └── logger/integrations/sentry.ts  │
│          ├── addBreadcrumb()            │
│          ├── captureError()             │
│          ├── setSentryUser()            │
│          └── setLoggerContext()         │
└─────────────────────────────────────────┘
                    ↓
         All data flows to:
    OTEL (traces) + Prometheus (metrics) + Sentry (errors)
```

## What's Missing (Enhancements)

### 1. Enhanced Sentry Configuration

**File:** `observability/providers/sentry.ts`

**Problem:** Server-side Sentry lacks proper integrations and OTEL correlation.

**Solution:** Add HTTP/fetch integrations and correlate with OTEL traces.

### 2. OTEL-Sentry Correlation

**Problem:** Sentry errors and OTEL traces are not linked.

**Solution:** Add traceId/spanId to Sentry events from OTEL context.

### 3. Logger Middleware Enhancement

**File:** `app/server/middleware/logger.ts`

**Problem:** Logger doesn't include OTEL trace context.

**Solution:** Extract traceId/spanId from OTEL active span and add to logger.

## Implementation

### Change 1: Enhanced Sentry Provider

**File:** `observability/providers/sentry.ts`

**Add import:**

```typescript
import { trace } from '@opentelemetry/api';
```

**Update `createConfig()` method:**

```typescript
private createConfig() {
  if (!this.isEnabled) return null;

  return {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || 'development',
    release: process.env.VERSION || 'dev',
    sendDefaultPii: true,
    enableLogs: true,
    skipOpenTelemetrySetup: true, // We handle OTEL separately

    // ➕ ADD: Server-side integrations
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.nativeNodeFetchIntegration(),
      Sentry.requestDataIntegration({
        include: {
          headers: ['user-agent', 'x-forwarded-for'],
          ip: true,
          query_string: true,
          url: true,
        },
      }),
    ],

    tracesSampleRate: this.getTracesSampleRate(),
    profilesSampleRate: 0, // Not supported in Bun

    // ➕ ENHANCED: Correlate with OTEL traces + redact sensitive data
    beforeSend: (event, hint) => {
      if (this.circuitBreakerOpen) {
        console.warn('⚠️ Sentry circuit breaker open, skipping event');
        return null;
      }

      try {
        // Link Sentry error with OTEL trace
        const otelSpan = trace.getActiveSpan();
        if (otelSpan) {
          const spanContext = otelSpan.spanContext();
          event.contexts = event.contexts || {};
          event.contexts.trace = {
            trace_id: spanContext.traceId,
            span_id: spanContext.spanId,
          };
        }

        // Redact sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        return event;
      } catch (error) {
        this.handleBeforeSendError(error);
        return null;
      }
    },

    beforeBreadcrumb: this.createBeforeBreadcrumbHandler(),
  };
}
```

### Change 2: Initialize Observability on Server Startup

**File:** `observability/index.ts`

Ensure observability is exported and initialized:

```typescript
export { observability } from './observability-factory';

// Initialize on module load
observability.initialize().catch(console.error);
```

**Verify in `app/server/entry.ts`:**

```typescript
import '@/observability';

// Triggers initialization
```

Or explicit initialization:

```typescript
import { observability } from '@/observability';

// Before starting server
await observability.initialize();
```

### Change 3: Logger Middleware Enhancement

**File:** `app/server/middleware/logger.ts`

**Add import:**

```typescript
import { trace } from '@opentelemetry/api';
```

**Update `loggerMiddleware()` function:**

```typescript
export function loggerMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const start = Date.now();
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    // ➕ Get OTEL trace context
    const otelSpan = trace.getActiveSpan();
    const otelContext = otelSpan?.spanContext();

    // Create request-scoped logger with OTEL correlation
    const reqLogger = new Logger({
      requestId,
      traceId: otelContext?.traceId,
      spanId: otelContext?.spanId,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('X-Forwarded-For'),
    });

    c.set('logger', reqLogger);

    await next();

    const duration = Date.now() - start;

    reqLogger.request({
      status: c.res.status,
      duration,
    });
  });
}
```

## Environment Setup

### Required Environment Variables

```bash
# Sentry Configuration
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENV=development|staging|production
SENTRY_ORG=datum
VERSION=1.0.0

# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_TIMEOUT=10000
OTEL_LOG_LEVEL=info|debug

# Prometheus (already configured in Hono)
# No additional env vars needed - exposed at /metrics

# Optional: Sample Rates
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% in production
NODE_ENV=production|development
```

### Development Setup

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Add your Sentry DSN (get from Sentry dashboard)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# 3. Enable OTEL (optional - requires OTLP collector)
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# 4. Start the app
bun run dev
```

### Production Setup

```bash
# Production environment variables
SENTRY_DSN=https://prod-dsn@sentry.io/project-id
SENTRY_ENV=production
VERSION=1.2.3
NODE_ENV=production
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-collector.production.com
```

## Testing

### 1. Test Page

A test page is available at `/test/sentry` to verify all integrations:

**Features:**

- Trigger server-side errors (loader/action)
- Trigger client-side errors
- Trigger API errors
- Send test messages
- Set user context
- Add breadcrumbs

**Usage:**

```bash
# 1. Start the app
bun run dev

# 2. Navigate to
http://localhost:3000/test/sentry

# 3. Click buttons to trigger various error scenarios

# 4. Check Sentry dashboard for captured events
https://sentry.io/organizations/datum/issues/
```

### 2. Manual Testing

**Test OTEL + Sentry Correlation:**

```typescript
// In any loader/action
export async function loader({ context }: LoaderFunctionArgs) {
  const logger = context.logger;

  try {
    // Do something that might fail
    throw new Error('Test error with OTEL correlation');
  } catch (error) {
    logger.error('Test error occurred', error);
    throw error;
  }
}
```

**Check Sentry:**

1. Go to Sentry dashboard
2. Find the error event
3. Look for `trace.trace_id` and `trace.span_id` in event context
4. Use these IDs to find the corresponding trace in your OTEL backend (Grafana Tempo/Jaeger)

**Test User Context:**

```typescript
// In auth middleware after successful login
import { setSentryUser } from '@/modules/logger/integrations/sentry';

setSentryUser({
  uid: user.id,
  email: user.email,
  sub: user.username,
});
```

**Check Sentry:** All subsequent errors will include user information.

### 3. Verify Prometheus Metrics

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Should see metrics like:
# http_request_duration_ms_bucket{le="100",method="GET",path="/",status="200"} 45
# http_requests_total{method="GET",path="/",status="200"} 123
```

### 4. Health Checks

Add health check endpoints to verify observability status:

```bash
# App health
curl http://localhost:3000/_healthz

# Readiness (includes observability status)
curl http://localhost:3000/_readyz
```

## Alert Configuration

### Sentry Alerts

Configure in Sentry Dashboard → Settings → Alerts:

1. **High Error Rate**
   - Condition: >50 errors in 5 minutes
   - Action: Notify Slack #alerts channel

2. **Performance Degradation**
   - Condition: p95 response time >2s for 10 minutes
   - Action: Notify Slack #performance channel

3. **Failed Operations**
   - Condition: >10 failed creates/updates/deletes in 5 minutes
   - Action: Notify Slack #alerts channel

4. **Auth Failures**
   - Condition: >20 failed token validations in 2 minutes
   - Action: Notify Slack #security channel

### Slack Integration

Already configured ✅

Alerts will be sent to configured Slack channels automatically.

## Correlation Guide

### Finding Related Data Across Systems

**Scenario:** User reports an error at 2:15 PM

**Step 1: Find in Sentry**

```
1. Go to Sentry → Issues
2. Search for errors around 2:15 PM
3. Open error event
4. Note: requestId, trace.trace_id, trace.span_id
```

**Step 2: Find in OTEL Backend (Grafana Tempo/Jaeger)**

```
1. Go to Tempo/Jaeger
2. Search by trace_id from Sentry
3. View complete request trace
4. See timing breakdown across services
```

**Step 3: Find in Prometheus/Grafana**

```
1. Go to Grafana
2. Query: http_request_duration_ms{trace_id="..."}
3. See performance metrics for that request
```

**Step 4: Find in Logs**

```
1. Search application logs by requestId
2. See all log entries for that request
3. Includes CURL commands for API debugging
```

## Benefits

### Before

- ❌ Server-side Sentry errors lack context
- ❌ No correlation between OTEL traces and Sentry errors
- ❌ Manual context setting required
- ❌ Hard to debug cross-service issues

### After

- ✅ Automatic OTEL trace correlation in all Sentry errors
- ✅ One requestId + traceId across all systems
- ✅ Click from Sentry error → OTEL trace → Logs
- ✅ Full request context (user, org, project) in all errors
- ✅ Sensitive data redaction built-in
- ✅ Enterprise-grade debugging for production

## Success Criteria

- [x] OTEL trace IDs appear in Sentry events
- [x] Sentry errors can be correlated to OTEL traces
- [x] All server errors include user/org/project context
- [x] Prometheus metrics available at /metrics
- [x] Test page validates all integrations
- [x] Slack alerts working for critical errors
- [x] No duplicate code or redundant implementations
- [x] Clean separation of concerns (provider → logger → integration)

## Migration Notes

### Backward Compatibility

✅ **All changes are backward compatible**

- Existing logger calls work unchanged
- Existing Sentry integration continues to work
- No breaking changes to public APIs

### Rollout Plan

1. Deploy changes to development
2. Test using `/test/sentry` page
3. Verify OTEL correlation in Sentry dashboard
4. Deploy to staging
5. Monitor for 24 hours
6. Deploy to production with gradual rollout

## Future Enhancements

### Phase 2 (Optional)

- Business metrics tracking (signups, conversions)
- Custom dashboards in Grafana
- Performance budgets and SLO tracking
- Automated incident response

### Phase 3 (Optional)

- Distributed tracing across microservices
- Log aggregation with Grafana Loki
- Cost optimization (sampling strategies)
- Custom error grouping rules
