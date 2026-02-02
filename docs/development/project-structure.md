# Project Structure

This document provides a comprehensive overview of the codebase organization.

---

## Root Directory

```
cloud-portal/
├── app/                    # Main application code
├── build/                  # Build output (gitignored)
├── config/                 # K8s Kustomize configs
├── cypress/                # E2E & component tests
├── dev/                    # Development utilities
├── docs/                   # Documentation (you are here)
├── observability/          # OTEL, Sentry initialization
├── public/                 # Static assets
├── .env.example            # Environment template
├── .github/                # GitHub Actions workflows
├── docker-compose.yml      # Local observability stack
├── Dockerfile              # Production container
├── openapi-ts.config.ts    # API client generation config
├── package.json            # Scripts & dependencies
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## App Directory

The `app/` directory contains all application code:

```
app/
├── components/             # Core shared components
├── features/               # Feature-specific components
├── hooks/                  # Custom React hooks
├── layouts/                # Layout components
├── modules/                # Infrastructure modules
├── providers/              # React context providers
├── resources/              # Domain resource modules
├── routes/                 # File-based routing (pages)
├── server/                 # Hono server code
├── styles/                 # Global styles & themes
├── utils/                  # Utility functions
├── entry.client.tsx        # Client entry point
├── entry.server.tsx        # Server entry point
├── root.tsx                # Root layout component
├── routes.ts               # Route configuration
└── types.d.ts              # Global type definitions
```

---

## Key Directories Explained

### `app/components/`

Core shared components used across ALL parts of the app.

```
components/
├── page-header/
├── empty-state/
├── confirm-dialog/
├── error-boundary/
└── ...
```

**When to add here:** Component is used in 3+ different features/pages.

### `app/features/`

Feature-specific components, only used within that feature.

```
features/
├── dns/
│   └── components/
│       ├── zone-wizard/
│       └── record-editor/
├── organization/
│   └── components/
│       └── member-invite/
└── ...
```

**When to add here:** Component is tightly coupled to one feature.

### `app/modules/`

Reusable infrastructure modules (not UI components).

```
modules/
├── auth/                   # Authentication logic
├── axios/                  # Axios client setup
├── control-plane/          # Generated API clients
│   ├── gateway/
│   ├── iam/
│   ├── networking/
│   └── ...
├── datum-ui/               # Datum component library
├── fathom/                 # Analytics integration
├── helpscout/              # Support widget
├── logger/                 # Structured logging
├── prometheus/             # Metrics collection
├── rbac/                   # Role-based access control
├── redis/                  # Redis client
├── shadcn/                 # shadcn/ui primitives
├── tanstack/               # TanStack configurations
└── watch/                  # K8s Watch API
```

**When to add here:** Infrastructure, integrations, or shared utilities with multiple files.

### `app/resources/`

Domain resource modules following a consistent pattern.

```
resources/
├── organizations/
│   ├── organization.schema.ts
│   ├── organization.adapter.ts
│   ├── organization.service.ts
│   ├── organization.queries.ts
│   └── index.ts
├── projects/
├── dns-zones/
├── dns-records/
├── members/
├── roles/
└── ...
```

**When to add here:** New API resource type with CRUD operations.

See [Domain Modules](../architecture/domain-modules.md) for details.

### `app/routes/`

File-based routing - each file becomes a route.

```
routes/
├── _index.tsx              # /
├── login.tsx               # /login
├── organizations/
│   ├── _layout.tsx         # Layout wrapper
│   ├── index.tsx           # /organizations
│   └── $orgId/
│       ├── index.tsx       # /organizations/:orgId
│       ├── settings.tsx    # /organizations/:orgId/settings
│       └── projects/
│           └── $projectId/
│               └── dns-zones/
│                   └── index.tsx  # /organizations/:orgId/projects/:projectId/dns-zones
└── ...
```

**Conventions:**

- `_layout.tsx` - Layout wrappers
- `_index.tsx` - Index routes
- `$param` - Dynamic parameters
- Nested folders = nested routes

### `app/server/`

Hono server code for the BFF (Backend-for-Frontend).

```
server/
├── entry.ts                # Server entry point, middleware setup
├── middleware/
│   ├── auth.ts             # Session authentication
│   ├── error-handler.ts    # Global error handling
│   ├── logger.ts           # Request logging
│   ├── request-context.ts  # AsyncLocalStorage setup
│   └── sentry-tracing.ts   # Sentry transaction tracing
├── routes/
│   └── api/                # API routes
│       ├── index.ts
│       └── ...
└── types.ts                # Server type definitions
```

### `app/utils/`

Utility functions and configurations.

```
utils/
├── auth/                   # Auth configuration
├── config/
│   ├── paths.config.ts     # Route paths
│   ├── sentry.config.ts    # Sentry configuration
│   └── site.config.ts      # Site metadata
├── env/
│   ├── env.server.ts       # Environment validation
│   ├── types.ts            # Env type definitions
│   └── index.ts            # Exports
└── helpers/                # Helper functions
```

---

## Other Directories

### `config/`

Kubernetes Kustomize configurations.

```
config/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── http-route.yaml
│   └── kustomization.yaml
└── dev/
    └── kustomization.yaml
```

### `cypress/`

Test files and configuration.

```
cypress/
├── e2e/                    # End-to-end tests
├── component/              # Component tests
├── fixtures/               # Test data
├── support/                # Custom commands
└── cypress.config.ts       # Configuration
```

### `dev/`

Development utilities.

```
dev/
└── docker/
    ├── grafana/            # Grafana configuration
    ├── prometheus/         # Prometheus configuration
    └── otel-collector-config.yml
```

### `observability/`

Observability initialization code.

```
observability/
├── index.ts                # Main initialization
├── providers/
│   ├── otel/               # OpenTelemetry provider
│   └── sentry/             # Sentry provider
├── dev-start.js            # Development startup script
└── start.js                # Production startup script
```

---

## Import Aliases

Use these aliases instead of relative paths:

| Alias        | Path                    |
| ------------ | ----------------------- |
| `@/`         | `app/`                  |
| `@shadcn/`   | `app/modules/shadcn/`   |
| `@datum-ui/` | `app/modules/datum-ui/` |

**Examples:**

```typescript
// Good
import { Button } from '@shadcn/ui/button';
import { DataTable } from '@datum-ui/components/data-table';
import { useOrganizations } from '@/resources/organizations';

// Avoid
import { Button } from '../../../modules/shadcn/ui/button';
```

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Domain Modules](../architecture/domain-modules.md)
- [Adding a New Page](../guides/adding-new-page.md)
