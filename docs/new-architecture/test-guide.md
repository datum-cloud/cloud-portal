# Testing & Verification Guide

A practical guide for developers to verify the architecture is working correctly.

---

## 1. Setup

### Prerequisites

- Node.js 20+
- Bun 1.0+
- Access to control plane API
- Environment variables configured

### Quick Start

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start development server
bun dev
```

### Verify App Loads

1. Open http://localhost:3000
2. Login with your credentials
3. Navigate to any organization/project
4. Check terminal for structured logs

---

## 2. Verification Checklist

Use this checklist to verify all systems are working correctly.

### Server & Middleware

| Feature                           | Test                                  | Expected Result              | ✓   |
| --------------------------------- | ------------------------------------- | ---------------------------- | --- |
| Hono server                       | Start `bun dev`                       | Server starts without errors | ☐   |
| Prometheus metrics (OTEL Enabled) | `curl http://localhost:3000/metrics`  | Prometheus format output     | ☐   |
| Health check                      | `curl http://localhost:3000/_healthz` | 200 OK                       | ☐   |
| Rate limiting                     | Send 100+ requests quickly            | 429 after limit              | ☐   |

### Real-Time (Watch API)

| Feature          | Test                                             | Expected Result                        | ✓   |
| ---------------- | ------------------------------------------------ | -------------------------------------- | --- |
| Watch connection | Open DNS Zone detail, check Network tab          | EventSource with `?watch=true` visible | ☐   |
| Live updates     | Create/update/delete record in another tab       | UI updates without refresh             | ☐   |
| Reconnection     | Kill/restart server                              | Watch reconnects automatically         | ☐   |

### Data Layer

| Feature           | Test                              | Expected Result                  | ✓   |
| ----------------- | --------------------------------- | -------------------------------- | --- |
| SSR hydration     | Hard refresh (Cmd+Shift+R) page   | No loading spinner, data instant | ☐   |
| React Query cache | Open React Query DevTools         | Data in cache after load         | ☐   |
| Optimistic delete | Delete a DNS record               | Instant UI removal               | ☐   |
| Error rollback    | Delete with network disconnected  | Record reappears after error     | ☐   |

### Logging & Observability

| Feature            | Test                    | Expected Result           | ✓   |
| ------------------ | ----------------------- | ------------------------- | --- |
| Request logging    | Trigger any API action  | Structured log in terminal| ☐   |
| CURL generation    | Check dev logs          | CURL command printed      | ☐   |
| Request ID         | Check response headers  | X-Request-ID present      | ☐   |
| Sentry integration | Trigger an error        | Event appears in Sentry   | ☐   |

### Environment

| Feature        | Test                             | Expected Result                | ✓   |
| -------------- | -------------------------------- | ------------------------------ | --- |
| Env validation | Remove required var, start server| Fail-fast with clear error     | ☐   |
| Public vars    | Use `env.public.appUrl` in code  | Value accessible               | ☐   |
| Server vars    | Use `env.server.sessionSecret`   | Value accessible (server only) | ☐   |

---

## 3. Troubleshooting

### Watch connection not working

1. Check Network tab for EventSource errors
2. Verify `/api/proxy` route is responding
3. Check server logs for connection errors
4. Ensure resource supports watch (check `.watch.ts` file exists)

### SSR data not hydrating

1. Check if `useHydrateX` hook is called in component
2. Verify loader is returning data correctly
3. Open React Query DevTools to inspect cache state

### CURL not showing in logs

1. Verify `NODE_ENV=development`
2. Check logger config in `app/modules/logger/logger.config.ts`

### Env validation not failing

1. Make sure you're importing from `@/utils/env`
2. Check that validation runs on server startup (not lazy)
