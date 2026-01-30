# Environment Setup

This guide walks you through configuring environment variables for local development.

---

## Step 1: Clone the Repository

```bash
git clone git@github.com:datum/cloud-portal.git
cd cloud-portal
```

---

## Step 2: Install Dependencies

```bash
bun install
```

---

## Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Open in your editor
code .env  # or vim .env
```

### Required Variables

These must be set for the app to start:

| Variable              | Description                           | Example                                      |
| --------------------- | ------------------------------------- | -------------------------------------------- |
| `APP_URL`             | Your local app URL                    | `http://localhost:3000`                      |
| `API_URL`             | Control Plane API URL                 | `http://localhost:8080` or staging URL       |
| `SESSION_SECRET`      | Session encryption key (min 32 chars) | `your-super-secret-session-key-min-32-chars` |
| `AUTH_OIDC_ISSUER`    | OIDC provider URL                     | `https://your-oidc-provider.com`             |
| `AUTH_OIDC_CLIENT_ID` | OIDC client ID                        | `your-client-id`                             |

### Optional Variables (Development)

These enhance the development experience:

```env
# Logging
LOG_LEVEL=debug          # debug | info | warn | error
LOG_FORMAT=pretty        # json | pretty | compact
LOG_CURL=true            # Generate CURL commands for API calls
LOG_REDACT_TOKENS=true   # Hide sensitive tokens in logs

# Observability (for local stack)
OTEL_ENABLED=false
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3002
```

### API URLs

| Environment | API URL                             |
| ----------- | ----------------------------------- |
| Local       | `http://localhost:8080`             |
| Staging     | `https://api.staging.env.datum.net` |
| Production  | `https://api.datum.net`             |

---

## Step 4: Verify Configuration

Run TypeScript check to ensure environment is properly configured:

```bash
bun run typecheck
```

**Expected:** No errors. If you see environment-related errors, check your `.env` file.

---

## Environment Variable Reference

### Runtime Configuration

| Variable   | Required | Default       | Description                |
| ---------- | -------- | ------------- | -------------------------- |
| `NODE_ENV` | No       | `development` | Environment mode           |
| `VERSION`  | No       | -             | Git commit SHA (set in CI) |
| `DEBUG`    | No       | `false`       | Enable debug mode          |

### Logging

| Variable            | Required | Default  | Description                 |
| ------------------- | -------- | -------- | --------------------------- |
| `LOG_LEVEL`         | No       | `info`   | Log verbosity               |
| `LOG_FORMAT`        | No       | `pretty` | Log output format           |
| `LOG_CURL`          | No       | `false`  | Generate CURL commands      |
| `LOG_REDACT_TOKENS` | No       | `true`   | Redact sensitive data       |
| `LOG_PAYLOADS`      | No       | `false`  | Log request/response bodies |

### Observability

| Variable                      | Required | Default | Description             |
| ----------------------------- | -------- | ------- | ----------------------- |
| `SENTRY_DSN`                  | No       | -       | Sentry error tracking   |
| `SENTRY_ENV`                  | No       | -       | Sentry environment name |
| `OTEL_ENABLED`                | No       | `false` | Enable OpenTelemetry    |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No       | -       | OTEL collector endpoint |

### External Services

| Variable              | Required | Default | Description              |
| --------------------- | -------- | ------- | ------------------------ |
| `FATHOM_ID`           | No       | -       | Fathom Analytics ID      |
| `HELPSCOUT_BEACON_ID` | No       | -       | HelpScout support widget |
| `REDIS_URL`           | No       | -       | Redis for rate limiting  |

---

## Checkpoint

Your `.env` file should have at minimum:

```env
APP_URL=http://localhost:3000
API_URL=https://api.staging.env.datum.net
SESSION_SECRET=<32+ character string>
AUTH_OIDC_ISSUER=<your OIDC issuer URL>
AUTH_OIDC_CLIENT_ID=<your client ID>
```

---

## Next Step

Proceed to [Running Locally](./03-running-locally.md).
