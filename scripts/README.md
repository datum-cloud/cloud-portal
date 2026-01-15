# Scripts

This directory contains development scripts for the cloud portal.

---

## OpenAPI Generator

Generate typed SDK modules for control-plane APIs.

### Usage

```bash
bun run openapi
```

### What it does

1. **Prompts for credentials** - API URL and Bearer token
2. **Lists available resources** - Fetches from `/openapi/v3`
3. **Interactive selection** - Choose which resources to generate
4. **Smart folder naming** - Suggests folder names from resource paths
5. **Generates SDK modules** - Creates typed clients in `app/modules/control-plane/`

### Example Session

```
$ bun run openapi

OpenAPI Control-Plane Generator

? Enter API URL: https://api.datum.net
? Enter Bearer Token: ********

Fetching available resources from https://api.datum.net/openapi/v3...

Found 15 available resources.

? Select resources to generate (space to select, enter to confirm):
  ◯  1. apis/authorization.miloapis.com/v1alpha1
  ◉  2. apis/compute.miloapis.com/v1alpha1
  ◯  3. apis/discovery.miloapis.com/v1alpha1
  ◉  4. apis/dns-networking.miloapis.com/v1alpha1
  ...

Configure output folders:

? Folder name for apis/compute.miloapis.com/v1alpha1: (compute)
? Folder name for apis/dns-networking.miloapis.com/v1alpha1: (dns-networking)

──────────────────────────────────────────────────

Generating compute...
  Fetching spec...
  Running hey-api/openapi-ts...
  Cleaning up generated client files...
  Fixing imports...
  ✓ Generated → app/modules/control-plane/compute/

Generating dns-networking...
  Fetching spec...
  Running hey-api/openapi-ts...
  Cleaning up generated client files...
  Fixing imports...
  ✓ Generated → app/modules/control-plane/dns-networking/

──────────────────────────────────────────────────

Done! Generated 2/2 modules.

Generated modules:
  - app/modules/control-plane/compute/
  - app/modules/control-plane/dns-networking/
```

### Generated Output

Each module contains:

```
app/modules/control-plane/{folder}/
├── index.ts        # Re-exports from sdk.gen and types.gen
├── sdk.gen.ts      # SDK functions (imports shared client)
├── types.gen.ts    # TypeScript types
└── schemas.gen.ts  # Zod schemas
```

### Shared Client

All modules import from the shared client at `app/modules/control-plane/shared/`:

```typescript
// sdk.gen.ts imports
import type { Options, Client } from '../shared/client';
import { client } from '../shared/client.gen';
```

The shared client is **manually maintained** and not modified by this script.

### Getting a Token

You need a valid Bearer token to access the API. You can get one by:

1. Logging into the cloud portal
2. Opening browser DevTools → Network tab
3. Finding any API request and copying the `Authorization` header value

---

## Environment Variables

| Variable    | Description                                              |
| ----------- | -------------------------------------------------------- |
| `API_URL`   | Default API URL (optional, prompted if not set)          |
| `API_TOKEN` | Default API Bearer Token (optional, prompted if not set) |
