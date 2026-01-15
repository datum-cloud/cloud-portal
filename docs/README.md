# Datum Cloud Portal Documentation

Welcome to the Datum Cloud Portal developer documentation. This guide will help you get up to speed with the codebase and start contributing.

---

## Quick Start

New to the project? Start here:

1. **[Prerequisites](./getting-started/01-prerequisites.md)** - Required tools and access
2. **[Environment Setup](./getting-started/02-environment-setup.md)** - Configure your local environment
3. **[Running Locally](./getting-started/03-running-locally.md)** - Start the development server
4. **[First Steps](./getting-started/04-first-steps.md)** - Hands-on exercises

---

## Documentation Overview

### 📚 Getting Started

Step-by-step guides to get you productive:

| Document | Description |
|----------|-------------|
| [Prerequisites](./getting-started/01-prerequisites.md) | Tools, versions, and access needed |
| [Environment Setup](./getting-started/02-environment-setup.md) | .env configuration and variables |
| [Running Locally](./getting-started/03-running-locally.md) | Development server and scripts |
| [First Steps](./getting-started/04-first-steps.md) | Hands-on exercises and checkpoints |

### 🏗️ Architecture

Understand how the system works:

| Document | Description |
|----------|-------------|
| [Overview](./architecture/overview.md) | Tech stack and design principles |
| [Data Flow](./architecture/data-flow.md) | SSR, React Query, and mutations |
| [Domain Modules](./architecture/domain-modules.md) | Resource module structure |
| [Watch API](./architecture/watch-api.md) | Real-time updates via SSE |
| [ADRs](./architecture/adrs/) | Architecture Decision Records |

### 💻 Development

Day-to-day development tasks:

| Document | Description |
|----------|-------------|
| [Project Structure](./development/project-structure.md) | Folder organization and imports |
| [OpenAPI Generation](./development/openapi-generation.md) | Generating typed API clients |
| [Authentication](./development/authentication.md) | OIDC flow and session handling |
| [Testing](./development/testing.md) | E2E and component testing |
| [Code Quality](./development/code-quality.md) | Linting, formatting, TypeScript |

### 🎨 UI Components

Component library and patterns:

| Document | Description |
|----------|-------------|
| [Overview](./ui/overview.md) | Component hierarchy and decisions |
| [shadcn Rules](./ui/shadcn-rules.md) | Using shadcn/ui primitives |
| [datum-ui Guide](./ui/datum-ui-guide.md) | Datum component library |
| [Theming](./ui/theming.md) | Theme system and customization |
| [Forms](./ui/forms.md) | Form library patterns |

### ⚙️ Operations

Deployment and monitoring:

| Document | Description |
|----------|-------------|
| [Observability](./operations/observability.md) | Logging, tracing, metrics |
| [Deployment](./operations/deployment.md) | Docker, Kubernetes, CI/CD |
| [Troubleshooting](./operations/troubleshooting.md) | Common issues and solutions |

### 📖 Guides

How-to guides for common tasks:

| Document | Description |
|----------|-------------|
| [Adding a New Page](./guides/adding-new-page.md) | Create routes and pages |
| [Adding a New Resource](./guides/adding-new-resource.md) | K8s resource integration |
| [Adding a New Module](./guides/adding-new-module.md) | Feature module structure |
| [Adding a New Component](./guides/adding-new-component.md) | Component creation patterns |
| [Debugging Guide](./guides/debugging-guide.md) | Debugging tools and techniques |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | [Bun](https://bun.sh/) |
| **Framework** | [React Router v7](https://reactrouter.com/) |
| **Server** | [Hono](https://hono.dev/) |
| **State** | [TanStack Query](https://tanstack.com/query) |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS |
| **Forms** | [Conform](https://conform.guide/) + Zod |
| **API** | OpenAPI with [@hey-api/openapi-ts](https://heyapi.dev/) |

---

## Key Concepts

### Domain-Driven Resources

Resources (DNS Zones, Projects, etc.) follow a modular pattern:

```
app/resources/{resource}/
├── schema.ts    # Zod validation
├── adapter.ts   # API → Domain transformation
├── service.ts   # API client
├── queries.ts   # React Query definitions
└── watch.ts     # Real-time subscriptions
```

→ [Learn more](./architecture/domain-modules.md)

### Component Hierarchy

```
features/        → Feature-specific components
components/      → Shared app components
datum-ui/        → Design system (cross-portal)
shadcn/          → UI primitives
```

→ [Learn more](./ui/overview.md)

### Real-Time Updates

The portal uses SSE (Server-Sent Events) for real-time K8s resource updates:

```typescript
watchResources({
  onEvent: (event) => {
    // ADDED, MODIFIED, DELETED
    updateCache(event);
  },
});
```

→ [Learn more](./architecture/watch-api.md)

---

## Common Tasks

### Adding a Feature

1. Create resource module: [Adding a New Resource](./guides/adding-new-resource.md)
2. Create feature module: [Adding a New Module](./guides/adding-new-module.md)
3. Create routes: [Adding a New Page](./guides/adding-new-page.md)

### Debugging Issues

1. Check [Troubleshooting](./operations/troubleshooting.md) for common issues
2. Use [Debugging Guide](./guides/debugging-guide.md) for tools
3. View traces in [Observability](./operations/observability.md)

### Understanding the Codebase

1. Start with [Architecture Overview](./architecture/overview.md)
2. Review [Data Flow](./architecture/data-flow.md)
3. Explore [Project Structure](./development/project-structure.md)

---

## Architecture Decision Records

Important architectural decisions are documented as ADRs:

| ADR | Title |
|-----|-------|
| [ADR-001](./architecture/adrs/adr-001-domain-driven-resource-modules.md) | Domain-Driven Resource Modules |
| [ADR-002](./architecture/adrs/adr-002-service-adapter-pattern.md) | Service Adapter Pattern |
| [ADR-003](./architecture/adrs/adr-003-query-factory-pattern.md) | Query Factory Pattern |
| [ADR-004](./architecture/adrs/adr-004-watch-api-pattern.md) | Watch API Pattern |

→ [All ADRs](./architecture/adrs/)

---

## Getting Help

- **Issues:** Report bugs or request features on GitHub
- **Questions:** Reach out to the team on Slack
- **PRs:** Follow the contribution guidelines

---

## Contributing

1. Read the [Code Quality](./development/code-quality.md) guidelines
2. Follow the component patterns in [UI docs](./ui/overview.md)
3. Write tests as described in [Testing](./development/testing.md)
4. Ensure CI passes before requesting review
