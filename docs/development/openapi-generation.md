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

## Fetching OpenAPI Specs

### Authentication

You need a valid bearer token from your OIDC provider. Get it from:
1. The browser DevTools (Network tab → Authorization header)
2. Or by logging in and checking the session

### API Endpoints

Specs are available at different endpoints depending on resource scope:

#### User-Scoped Resources

```bash
# Identity API
curl -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/apis/iam.miloapis.com/v1alpha1/users/${USER_ID}/control-plane/openapi/v3/apis/identity.miloapis.com/v1alpha1" \
  -o specs/identity.json
```

#### Organization-Scoped Resources

```bash
# IAM API
curl -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/apis/iam.miloapis.com/v1alpha1/organizations/${ORG_ID}/control-plane/openapi/v3/apis/iam.miloapis.com/v1alpha1" \
  -o specs/iam.json
```

#### Project-Scoped Resources

```bash
# DNS Networking API
curl -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${PROJECT_ID}/control-plane/openapi/v3/apis/dns.networking.miloapis.com/v1alpha1" \
  -o specs/dns-networking.json

# Networking API
curl -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${PROJECT_ID}/control-plane/openapi/v3/apis/networking.miloapis.com/v1alpha1" \
  -o specs/networking.json
```

### Available API Groups

| API Group | Scope | Description |
|-----------|-------|-------------|
| `identity.miloapis.com` | User | User profile, sessions |
| `iam.miloapis.com` | Org | Organizations, members, roles |
| `resourcemanager.miloapis.com` | Org | Projects, resource management |
| `dns.networking.miloapis.com` | Project | DNS zones, records, domains |
| `networking.miloapis.com` | Project | HTTP proxies, networking |
| `compute.miloapis.com` | Project | Compute resources |
| `quota.miloapis.com` | Org | Quota management |
| `authorization.miloapis.com` | Org | Access reviews |

---

## Generating Clients

### Configuration

The generation is configured in `openapi-ts.config.ts`:

```typescript
import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './specs/gateway.json',
  output: './app/modules/control-plane/gateway',
  plugins: [
    ...defaultPlugins,
    '@hey-api/client-axios',
    '@hey-api/schemas',
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
  ],
});
```

### Running Generation

```bash
# Generate from the configured spec
bun run openapi-ts

# Or specify a different config
bunx openapi-ts -c openapi-ts.config.ts
```

### Multiple Specs

To generate from multiple specs, you can either:

1. **Run multiple times** with different configs
2. **Create a script** that processes all specs:

```bash
#!/bin/bash
for spec in specs/*.json; do
  name=$(basename "$spec" .json)
  bunx openapi-ts \
    --input "$spec" \
    --output "app/modules/control-plane/$name"
done
```

---

## Generated Files

Each generated module contains:

| File | Purpose |
|------|---------|
| `sdk.gen.ts` | API functions (e.g., `getOrganization()`) |
| `types.gen.ts` | TypeScript types for requests/responses |
| `schemas.gen.ts` | Zod schemas for runtime validation |
| `index.ts` | Re-exports |

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

1. **Fetch new spec:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "${API_URL}/apis/.../openapi/v3/apis/..." \
     -o specs/api-name.json
   ```

2. **Regenerate clients:**
   ```bash
   bun run openapi-ts
   ```

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

The spec may be outdated. Fetch a fresh spec:
```bash
curl -H "Authorization: Bearer $TOKEN" "$API_URL/..." -o specs/api.json
bun run openapi-ts
```

### Generation fails

Check the spec is valid JSON:
```bash
cat specs/api.json | jq . > /dev/null
```

---

## Related Documentation

- [Domain Modules](../architecture/domain-modules.md) - How to use generated clients
- [Data Flow](../architecture/data-flow.md) - Request lifecycle
- [Adding a New Resource](../guides/adding-new-resource.md)
