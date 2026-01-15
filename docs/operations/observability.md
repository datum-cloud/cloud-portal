# Observability

This document covers logging, error tracking, and monitoring in the cloud portal.

---

## Overview

The observability stack consists of:

| Component | Purpose | Local | Production |
|-----------|---------|-------|------------|
| **Sentry** | Error tracking | Optional | Required |
| **OpenTelemetry** | Distributed tracing | Jaeger | Grafana Tempo |
| **Prometheus** | Metrics collection | Local | Cloud |
| **Grafana** | Dashboards | Local | Cloud |

---

## Logging

### Console Logging

Use structured logging in development:

```typescript
// Simple logging
console.log('User logged in', { userId, orgId });

// Error logging
console.error('Failed to fetch zones', { error, params });
```

### Log Levels

- `console.log` - General information
- `console.warn` - Warnings, non-critical issues
- `console.error` - Errors, exceptions

### Server-Side Logging

Server logs are captured by the Hono server and forwarded to OTEL:

```typescript
// In loaders/actions
export async function loader({ request }: LoaderFunctionArgs) {
  console.log('Loading zones', { url: request.url });
  // ...
}
```

---

## Error Tracking (Sentry)

### Configuration

Set up in `.env`:

```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=datum
SENTRY_PROJECT=cloud-portal
```

### Client-Side Errors

Sentry automatically captures:

- Unhandled exceptions
- Promise rejections
- React error boundaries
- Network errors

### Manual Error Reporting

```typescript
import * as Sentry from '@sentry/react';

// Capture exception
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'dns' },
    extra: { zoneId, recordType },
  });
}

// Capture message
Sentry.captureMessage('Unexpected state', 'warning');
```

### User Context

User context is automatically set on login:

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  organizationId: orgId,
});
```

### Performance Monitoring

Sentry tracks:

- Page load times
- Route transitions
- API call durations
- React component renders

---

## Distributed Tracing (OpenTelemetry)

### Architecture

```
Browser → Hono Server → Control Plane APIs
   │          │              │
   └──────────┴──────────────┘
              │
         Trace Context
              │
              ▼
     Jaeger (local) / Tempo (prod)
```

### Configuration

```bash
# .env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=cloud-portal
OTEL_ENABLED=true
```

### Automatic Instrumentation

The following are automatically traced:

- HTTP requests (incoming and outgoing)
- Route handlers (loaders, actions)
- Database queries
- External API calls

### Manual Spans

For custom tracing:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('cloud-portal');

async function complexOperation() {
  return tracer.startActiveSpan('complex-operation', async (span) => {
    try {
      span.setAttribute('custom.attribute', 'value');

      // Nested span
      await tracer.startActiveSpan('sub-operation', async (subSpan) => {
        await doSomething();
        subSpan.end();
      });

      return result;
    } finally {
      span.end();
    }
  });
}
```

### Viewing Traces

**Local (Jaeger):**
1. Start observability stack: `bun run dev:otel`
2. Open http://localhost:16686
3. Select "cloud-portal" service
4. Search for traces

**Finding a Trace:**
- By trace ID from logs
- By operation name
- By tags (user ID, route, etc.)

---

## Metrics (Prometheus)

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `http_requests_in_flight` | Gauge | Concurrent requests |
| `nodejs_heap_size_bytes` | Gauge | Memory usage |

### Custom Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

// Counter
const zoneCreations = new Counter({
  name: 'dns_zone_creations_total',
  help: 'Total DNS zones created',
  labelNames: ['org_id'],
});

zoneCreations.inc({ org_id: orgId });

// Histogram
const queryDuration = new Histogram({
  name: 'dns_query_duration_seconds',
  help: 'DNS query duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});

const timer = queryDuration.startTimer();
await performQuery();
timer();
```

### Metrics Endpoint

Metrics are exposed at `/metrics`:

```bash
curl http://localhost:3000/metrics
```

---

## Local Observability Stack

### Starting the Stack

```bash
# Start all observability services
bun run dev:otel

# Or with docker-compose
docker-compose -f docker-compose.otel.yml up -d
```

### Services

| Service | Port | URL |
|---------|------|-----|
| Jaeger UI | 16686 | http://localhost:16686 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |
| OTEL Collector | 4318 | (HTTP receiver) |
| OTEL Collector | 4317 | (gRPC receiver) |

### Grafana Dashboards

Pre-configured dashboards:

1. **Application Overview** - Request rate, error rate, latency
2. **Node.js Runtime** - Memory, CPU, event loop
3. **API Performance** - Per-endpoint metrics

Default credentials: admin/admin

### Stopping the Stack

```bash
docker-compose -f docker-compose.otel.yml down
```

---

## Production Observability

### Sentry Setup

1. Create project in Sentry
2. Configure DSN in deployment
3. Set up release tracking
4. Configure alerts

### Grafana Cloud

1. Configure OTEL exporter endpoint
2. Set up Tempo for traces
3. Configure Prometheus remote write
4. Import dashboards

### Alert Rules

Configure alerts for:

- Error rate > threshold
- P99 latency > threshold
- Memory usage > threshold
- Failed health checks

---

## Debugging with Observability

### Tracing a Request

1. Get trace ID from logs or network tab
2. Search in Jaeger/Tempo
3. Examine span timeline
4. Check span attributes and logs

### Correlating Errors

1. Find error in Sentry
2. Get trace ID from error context
3. View full trace
4. Identify root cause

### Performance Analysis

1. Open Grafana dashboard
2. Identify slow endpoints
3. View traces for slow requests
4. Check span breakdown

---

## Best Practices

### DO

- Add context to errors (user ID, org ID, resource ID)
- Use structured logging
- Add custom spans for complex operations
- Set meaningful span names

### DON'T

- Log sensitive data (tokens, passwords)
- Create too many custom metrics
- Ignore high-cardinality labels
- Skip error context

---

## Related Documentation

- [Troubleshooting](./troubleshooting.md) - Common issues
- [Deployment](./deployment.md) - Production setup
- [Local Development](../getting-started/03-running-locally.md) - Dev setup
