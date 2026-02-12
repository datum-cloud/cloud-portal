# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Datum Cloud Portal.

---

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. ADRs help future developers understand:

- **Why** a decision was made
- **What** alternatives were considered
- **When** it was decided
- **What** the implications are

---

## Current ADRs

| ADR                                            | Title                             | Status   | Date       |
| ---------------------------------------------- | --------------------------------- | -------- | ---------- |
| [001](./001-express-to-hono-migration.md)      | Express to Hono Migration         | Accepted | 2026-01    |
| [002](./002-domain-driven-resource-modules.md) | Domain-Driven Resource Modules    | Accepted | 2026-01    |
| [003](./003-k8s-watch-api-integration.md)      | K8s Watch API Integration         | Accepted | 2026-01    |
| [004](./004-structured-logger-module.md)       | Structured Logger Module          | Accepted | 2026-01    |
| [005](./005-unified-environment-config.md)     | Unified Environment Config        | Accepted | 2026-01    |
| [006](./006-sentry-otel-observability.md)      | Sentry + OTEL Observability       | Accepted | 2026-01    |
| [007](./007-dns-record-manager.md)             | DNS Record Manager                | Accepted | 2026-01    |
| [008](./008-graphql-integration.md)            | GraphQL Integration               | Accepted | 2026-01    |
| [009](./009-task-queue-k8s-integration.md)     | Task Queue + K8s Async Operations | Accepted | 2026-02-10 |

---

## ADR Status

- **Proposed** - Under discussion
- **Accepted** - Decision made and implemented
- **Deprecated** - No longer valid, superseded
- **Superseded** - Replaced by another ADR

---

## Writing a New ADR

### When to Write an ADR

Write an ADR when:

- Making a significant architectural change
- Choosing between multiple viable approaches
- Introducing a new pattern or technology
- Deprecating existing functionality

### ADR Template

```markdown
# ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD

---

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Rationale

Why is this the best choice among the alternatives?

## Alternatives Considered

### Option A: [Name]

- **Pros:** ...
- **Cons:** ...
- **Why rejected:** ...

### Option B: [Name]

- **Pros:** ...
- **Cons:** ...
- **Why rejected:** ...

## Consequences

### Positive

- ...

### Negative

- ...

### Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| ...  | ...        |

## References

- Links to related docs, issues, PRs
```

### Naming Convention

- Use sequential numbers: `001`, `002`, `003`, etc.
- Include descriptive title in filename: `007-dns-record-manager.md`
- Keep titles concise but descriptive

---

## Related Documentation

- [Architecture Overview](../overview.md)
- [Data Flow](../data-flow.md)
- [Domain Modules](../domain-modules.md)
