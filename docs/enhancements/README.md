# Enhancement Documents

This directory contains enhancement documents for the Datum Cloud Portal.

---

## What is an enhancement document?

An enhancement document is a **long-form design record for a feature or capability**. It captures the research and reasoning behind a substantial piece of work: what the platform actually provides, what the portal has today, which alternatives were evaluated and rejected, and which gaps remain open.

It answers questions that neither the code nor the PR description can:

- **What** the platform contract is, and which parts of it the UI may rely on
- **Why** the implementation sits at the layer it does, rather than an obvious-looking alternative
- **What** was deliberately left out, and what would have to change to revisit it
- **Where** the known gaps are, stated honestly rather than discovered later

---

## Enhancement vs. ADR

Both record decisions. They differ in scope and shape.

|             | ADR ([`../architecture/adrs/`](../architecture/adrs/))                                               | Enhancement (this directory)                                               |
| ----------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Scope**   | One architectural decision                                                                           | One feature or capability, end to end                                      |
| **Length**  | A few pages — context, decision, alternatives, consequences                                          | Long-form — backend contract, current state, gap analysis, design, gaps    |
| **Trigger** | "We chose X over Y for the codebase"                                                                 | "We are building X; here is everything needed to understand and extend it" |
| **Answers** | Why is the system built this way?                                                                    | How does this capability work, and why is it shaped like this?             |
| **Example** | [ADR-009: Task Queue + K8s Async Operations](../architecture/adrs/009-task-queue-k8s-integration.md) | [Quota-Aware UI Gating](./quota-aware-ui-gating.md)                        |

If the write-up is mostly "we picked this option, here's the trade-off", write an ADR. If it needs a backend model, a survey of what exists today, and a design that only makes sense once a reader has both, write an enhancement document.

Enhancement documents are **not** how-to guides. When an enhancement ships and developers need to work with it day to day, add a companion guide under [`../guides/`](../guides/) and cross-link the two — the enhancement holds the rationale, the guide holds the recipe.

---

## Current enhancement documents

| Document                                                                     | Status      | Date       | Description                                                              |
| ---------------------------------------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------ |
| [Portal Plugin System](./portal-plugin-system.md)                            | Proposed    | 2026-07-11 | Service-declared UI plugins materialized as `PortalPlugin` resources     |
| [Quota-Aware UI Gating](./quota-aware-ui-gating.md)                          | Implemented | 2026-08-02 | Gate create surfaces on AllowanceBucket headroom; explain quota 403s     |
| [Project Suspension & Read-Only Mode](./project-suspension-readonly-mode.md) | Implemented | 2026-08-06 | Surface suspended projects and gate project-scoped writes systematically |

> **Note on Quota-Aware UI Gating:** its own header still reads `Status: Research (pre-brainstorm)`, which was accurate when it was written. The work shipped — `app/modules/quota` exists with `useResourceQuota`, `QuotaGuard`, `QuotaExhaustedAlert`, `QuotaWatchBridge`, and the quota-aware toasts — so the status above reflects reality. The document remains valuable as the research base and backend reference.

---

## Status values

- **Research** — investigation in progress; no implementation committed
- **Proposed** — design complete, awaiting a decision to build
- **Accepted** — approved for implementation, not yet shipped
- **Implemented** — shipped; the document is now the design record
- **Superseded** — replaced by a later enhancement or ADR

---

## Writing a new enhancement document

### Naming

Descriptive kebab-case filename, no number prefix: `quota-aware-ui-gating.md`, `project-suspension-readonly-mode.md`. Enhancements are not sequential the way ADRs are.

### Header

```markdown
# Title: What This Enables

**Status:** Research | Proposed | Accepted | Implemented | Superseded
**Date:** YYYY-MM-DD
**Issue:** [org/repo#NNN](…)
**Reference architecture:** the in-repo module this one mirrors, if any
**BE reference:** the backend API group / repo this depends on
```

### Suggested structure

1. **Summary** — the problem in a paragraph, then headline findings or decisions as a numbered list
2. **The problem** — including the raw error or broken behavior a user actually hits
3. **Part 1..N** — backend contract, what the portal has today, gap analysis, the design
4. **Rationale / alternatives** — what was rejected and why, in enough detail that it is not re-proposed
5. **Known gaps** — stated honestly, with tracking issues where they exist
6. **Appendix: source index** — file paths, grouped by area, so the next reader can navigate the implementation

Update the status in the table above when the work ships.

---

## Related Documentation

- [Architecture Decision Records](../architecture/adrs/)
- [Architecture Overview](../architecture/overview.md)
- [Guides](../guides/)
