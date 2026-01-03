# Architecture Reports

Technical documentation for the Hono + React Query architecture refactor.

**Date:** January 2026
**Branch:** `refactor/hono-react-query-architecture`

---

## Overview

- [Architecture Overview](./architecture-overview.md) - Comprehensive report of the refactor
- [Test Guide](./test-guide.md) - Development verification checklist
- [Production Test Guide](./production-test-guide.md) - Staging smoke tests & regression suite

---

## Architecture Decision Records (ADRs)

| ADR                                                | Decision                       | Status   |
| -------------------------------------------------- | ------------------------------ | -------- |
| [001](./adr/001-express-to-hono-migration.md)      | Express to Hono Migration      | Accepted |
| [002](./adr/002-domain-driven-resource-modules.md) | Domain-Driven Resource Modules | Accepted |
| [003](./adr/003-k8s-watch-api-integration.md)      | K8s Watch API Integration      | Accepted |
| [004](./adr/004-structured-logger-module.md)       | Structured Logger Module       | Accepted |
| [005](./adr/005-unified-environment-config.md)     | Unified Environment Config     | Accepted |
| [006](./adr/006-sentry-otel-observability.md)      | Sentry + OTEL Observability    | Accepted |
| [007](./adr/007-dns-record-manager.md)             | DNS Record Manager             | Accepted |

---

## Quick Stats

| Metric               | Value   |
| -------------------- | ------- |
| Files Changed        | 514     |
| Lines Added          | +31,413 |
| Lines Removed        | -14,449 |
| Domain Modules       | 17      |
| BFF Routes Deleted   | 40+     |
| Legacy Hooks Deleted | 3       |
