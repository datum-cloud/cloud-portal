# Running Locally

This guide covers starting the development server and verifying everything works.

---

## Quick Start

```bash
# 1. Install dependencies (if not done)
bun install

# 2. Start development server
bun run dev
```

The app will be available at **http://localhost:3000**

---

## Verify the Application

### 1. Health Check

```bash
curl http://localhost:3000/_healthz
```

**Expected response:**
```json
{"status":"ok"}
```

### 2. Open in Browser

1. Navigate to http://localhost:3000
2. You should see the login page
3. Log in with your OIDC credentials
4. Navigate to any organization/project

### 3. Check Terminal Logs

You should see structured logs in your terminal:

```
🌐 Starting React Router development server...
📊 Observability initialization results: { sentry: true, otel: false }
[INFO] GET / 200 45ms
  → requestId: abc-123-def
```

If `LOG_CURL=true`, you'll also see CURL commands for API calls.

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build locally |
| `bun run start` | Start production server |

### Code Quality

| Command | Description |
|---------|-------------|
| `bun run lint` | Run ESLint with auto-fix |
| `bun run format` | Format code with Prettier |
| `bun run format:check` | Check formatting (CI) |
| `bun run typecheck` | TypeScript type checking |

### Testing

| Command | Description |
|---------|-------------|
| `bun run test:e2e` | Run E2E tests (dev server) |
| `bun run test:e2e:prod` | Run E2E tests (production build) |
| `bun run cypress:open` | Open Cypress UI |

### API Generation

| Command | Description |
|---------|-------------|
| `bun run openapi-ts` | Generate TypeScript from OpenAPI specs |

---

## Optional: Local Observability Stack

For full observability (metrics, tracing, dashboards), start the Docker stack:

```bash
docker-compose up -d
```

This starts:

| Service | URL | Description |
|---------|-----|-------------|
| Grafana | http://localhost:3002 | Metrics dashboards (admin/admin) |
| Prometheus | http://localhost:9090 | Metrics collection |
| Jaeger | http://localhost:16686 | Distributed tracing |
| OTEL Collector | localhost:4317/4318 | Telemetry ingestion |

To view app metrics:
```bash
curl http://localhost:3000/metrics
```

To stop the stack:
```bash
docker-compose down
```

---

## Troubleshooting

### Port 3000 already in use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Environment variable errors

```
Error: Required environment variable SESSION_SECRET is not set
```

**Solution:** Ensure your `.env` file exists and has all required variables. See [Environment Setup](./02-environment-setup.md).

### OIDC login failing

- Verify `AUTH_OIDC_ISSUER` is a valid HTTPS URL
- Verify `AUTH_OIDC_CLIENT_ID` is correct
- Check that your OIDC provider has `http://localhost:3000/auth/callback` as an allowed redirect URI

### API calls failing

- Check `API_URL` in your `.env`
- Verify you can reach the API: `curl $API_URL/_healthz`
- Check if you're logged in (session may have expired)

---

## Checkpoint

Before proceeding, verify:

- [ ] App loads at http://localhost:3000
- [ ] Health check returns `{"status":"ok"}`
- [ ] Can log in successfully
- [ ] See structured logs in terminal
- [ ] Can navigate to organizations/projects

---

## Next Step

Proceed to [First Steps](./04-first-steps.md) for hands-on exercises.
