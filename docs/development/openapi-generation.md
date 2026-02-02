# OpenAPI Client Generation

This document explains how to generate type-safe API clients from OpenAPI specifications.

---

## Overview

We use `@hey-api/openapi-ts` to generate TypeScript clients from OpenAPI specs provided by the Control Plane API. This ensures type safety between our frontend and the backend APIs.

---

## Generated Clients Location

Generated clients live in `app/modules/control-plane/`:

```
app/modules/control-plane/
├── authorization/
│   ├── sdk.gen.ts          # API functions
│   ├── types.gen.ts        # TypeScript types
│   └── schemas.gen.ts      # Zod schemas
├── compute/
├── discovery/
├── dns-networking/
├── gateway/
├── iam/
├── identity/
├── k8s-core/
├── networking/
├── quota/
├── resource-manager/
├── telemetry/
├── shared/                 # Shared utilities
│   ├── client/
│   └── core/
├── setup.client.ts         # Client-side setup
└── setup.server.ts         # Server-side setup
```

---

## Quick Start: Interactive Generator

The easiest way to generate OpenAPI clients is using the interactive generator:

```bash
bun run openapi
```

This will:

1. Prompt for API URL (defaults to `https://api.datum.net` or `API_URL` env var)
2. Prompt for Bearer Token (can be set via `API_TOKEN` env var)
3. Fetch and display all available API resources
4. Let you select which resources to generate
5. Generate the TypeScript clients automatically

### Environment Variables

You can set these environment variables to skip the prompts:

```bash
# Set API URL
export API_URL=https://api.datum.net

# Set Bearer Token
export API_TOKEN=your-bearer-token-here

# Then run the generator
bun run openapi
```

### Getting a Bearer Token

You need a valid bearer token from your OIDC provider. Get it from:

1. The browser DevTools (Network tab → Authorization header)
2. Or by logging in and checking the session

---

## Available API Groups

The generator will show all available API resources. Common ones include:

| API Group                      | Description                   |
| ------------------------------ | ----------------------------- |
| `identity.miloapis.com`        | User profile, sessions        |
| `iam.miloapis.com`             | Organizations, members, roles |
| `resourcemanager.miloapis.com` | Projects, resource management |
| `dns.networking.miloapis.com`  | DNS zones, records, domains   |
| `networking.miloapis.com`      | HTTP proxies, networking      |
| `compute.miloapis.com`         | Compute resources             |
| `quota.miloapis.com`           | Quota management              |
| `authorization.miloapis.com`   | Access reviews                |

---

## Generated Files

Each generated module contains:

| File             | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `sdk.gen.ts`     | API functions (e.g., `getOrganization()`) |
| `types.gen.ts`   | TypeScript types for requests/responses   |
| `schemas.gen.ts` | Zod schemas for runtime validation        |
| `index.ts`       | Re-exports                                |

### Example Usage

```typescript
// Import generated functions
import { getOrganizations, createOrganization } from '@/modules/control-plane/iam';

// List organizations
const response = await getOrganizations();
const orgs = response.data?.items ?? [];

// Create organization
const newOrg = await createOrganization({
  body: {
    metadata: { name: 'my-org' },
    spec: { displayName: 'My Organization' },
  },
});
```

---

## Client Setup

### Server-Side (`setup.server.ts`)

Configures Axios for server-side requests:

```typescript
// Automatically imported in server/entry.ts
import '@/modules/control-plane/setup.server';
```

Features:

- Base URL from `API_URL` env var
- Auth token injection via AsyncLocalStorage
- Request ID correlation
- Error handling

### Client-Side (`setup.client.ts`)

Configures Axios for browser requests:

```typescript
// Automatically imported in entry.client.tsx
import '@/modules/control-plane/setup.client';
```

Features:

- Proxy through BFF (`/api/proxy`)
- Cookie-based authentication
- CSRF protection

---

## Workflow: Updating API Clients

When the Control Plane API changes:

1. **Run the generator:**

   ```bash
   bun run openapi
   ```

2. **Select the resources** that need updating

3. **Update adapters** if response shape changed:

   ```typescript
   // app/resources/{resource}/{resource}.adapter.ts
   export function toResource(response: NewApiResponse): Resource {
     // Update transformation
   }
   ```

4. **Run type check:**

   ```bash
   bun run typecheck
   ```

5. **Test the changes:**
   ```bash
   bun run test:e2e
   ```

---

## Troubleshooting

### "Cannot find module" after generation

```bash
# Restart TypeScript server in VS Code
# Or run:
bun run typecheck
```

### Types don't match API response

The spec may be outdated. Re-run the generator:

```bash
bun run openapi
```

### Generation fails

Check that:

1. Your bearer token is valid and not expired
2. You have network access to the API URL
3. The selected API resource is available

---

## Advanced: Manual Generation

For advanced use cases, you can still use `@hey-api/openapi-ts` directly:

```bash
# Generate from a local spec file
bunx openapi-ts --input ./specs/api.json --output ./app/modules/control-plane/api-name
```

Or configure in `openapi-ts.config.ts`:

```typescript
import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './specs/gateway.json',
  output: './app/modules/control-plane/gateway',
  plugins: [
    ...defaultPlugins,
    '@hey-api/schemas',
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
  ],
});
```

---

## Related Documentation

- [Domain Modules](../architecture/domain-modules.md) - How to use generated clients
- [Data Flow](../architecture/data-flow.md) - Request lifecycle
- [Adding a New Resource](../guides/adding-new-resource.md)
