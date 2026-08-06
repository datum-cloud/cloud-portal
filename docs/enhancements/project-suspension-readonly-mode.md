# Project Suspension & Read-Only Mode: Systematic Write Gating

**Status:** Implemented
**Date:** 2026-08-06
**Issue:** [datum-cloud/cloud-portal#1356](https://github.com/datum-cloud/cloud-portal/issues/1356) — "Consumer UI for suspended project state" (AC #1 and AC #3)
**PR:** [datum-cloud/cloud-portal#1413](https://github.com/datum-cloud/cloud-portal/pull/1413)
**Parent enhancement:** [datum-cloud/enhancements#800](https://github.com/datum-cloud/enhancements/issues/800) — Project Suspension & Lifecycle Controls
**Reference architecture:** `app/modules/quota` (see [Quota-Aware UI Gating](./quota-aware-ui-gating.md)) and `app/modules/rbac`
**BE reference:** milo `resourcemanager.miloapis.com/v1alpha1` — `ProjectSuspension`, `ProjectStatus.Suspensions`, the `Suspended` condition, and the projectsuspension admission plugin

---

## Summary

A project can be **suspended** by an operator — for billing, abuse, fraud, compliance, or administrative reasons. When it is, milo's admission plugin refuses every Create and Update in that project with a 403 while leaving reads and deletes working.

Suspension deliberately **never flips `Ready`**. Before this work the portal read only `Ready`, so a suspended project rendered as fully healthy: green status badge, enabled sidebar, every "Add", "Save", and "Edit" button live and clickable. Clicking one produced an opaque Forbidden toast whose message embedded internal suspension resource names. The user had no way to learn that the project was suspended, why, or what would lift it.

This document is the design record for the fix. It covers the platform contract the portal reads, the derivation rules that turn it into a verdict, the gating architecture that stops writes at the data layer rather than at each button, the redaction contract, the alternatives that were rejected, and the gaps that remain open.

**Headline decisions:**

1. **The gate lives at the mutation layer, not the form layer.** `useGuardedMutation` wraps TanStack's `useMutation` inside project-scoped resource hooks, so adoption in ~12 `*.queries.ts` files covers every current and future call site. Per-button enumeration was the first pass and it did not hold.
2. **Deletes are never gated.** The platform permits deletion during suspension so customers can offboard; the UI must not invent a restriction the API does not have.
3. **Fail-safe direction is inverted relative to quota.** Quota gating is advisory and fails open on unknown; read-only gating also renders unmodified on unknown — because a false "suspended" on a healthy project is a worse error than a missed one.
4. **The consumer never sees operator-side detail.** Redaction is enforced at the derivation and error-message layers, not by asking call sites to remember.

---

## The problem

Milo's suspension model has one property that breaks the portal's default assumptions: **suspension is orthogonal to readiness.** A suspended project is still `Ready=True`. The portal's entire status vocabulary — the badge, the nav-disable path, the reconciliation waits — keys off `Ready`.

The result, before this work:

- Project status badge: **Active**.
- Sidebar: fully enabled.
- Every write affordance: enabled.
- Every write: silent 403, surfaced as a generic Forbidden toast.
- The 403's `message` embeds the suspension resource's name (e.g. `abuse-2026-07-13-phishing`), which is operator-side detail the customer must never see.

Two acceptance criteria from #1356 are in scope here: **AC #1** (surface the suspended state, its reason category, and an appeal path) and **AC #3** (expose no internal detail). AC #2 (an activity timeline of suspend/reinstate events) is blocked upstream — see [Known gaps](#known-gaps).

---

## Part 1 — The platform contract

### 1.1 Consumers cannot read `ProjectSuspension`

Milo deliberately removed the `ProjectSuspension` read verbs from the `project-viewer` role. The consumer-facing portal has no RBAC to list or get those resources at all, so it cannot build its UI from them.

Instead, milo projects a **pre-redacted, consumer-safe view onto the Project itself**. Exactly three fields per suspension are copied onto `Project.status.suspensions[]`:

```go
// milo pkg/apis/resourcemanager/v1alpha1/project_types.go
type ProjectSuspensionInfo struct {
    Reason             ProjectSuspensionReason             // Fraud|Abuse|Billing|Compliance|Administrative
    SuspendedAt        metav1.Time
    ReinstateAuthority ProjectSuspensionReinstateAuthority // Operator|Consumer
}
// ProjectStatus.Suspensions []ProjectSuspensionInfo
```

`requestedBy` (operator identity) and `description` (case notes) are omitted **at the API layer** — they never reach the client. That is the platform doing half of the redaction work; the portal does the other half (§1.4).

Alongside the list, a `Suspended` **condition** (`True`/`False`, reasons `Suspended`/`Active`) aggregates across all suspensions.

The portal validates its own slice of `status` with Zod rather than waiting on OpenAPI regeneration (`projectSchema.status` is `z.any()`):

```ts
// app/resources/projects/project.schema.ts
export const projectSuspensionInfoSchema = z.object({
  reason: projectSuspensionReasonSchema.catch('Administrative'),
  suspendedAt: z.string(),
  reinstateAuthority: z.enum(['Operator', 'Consumer']),
});
```

The `.catch` matters: a reason category milo adds later must not invalidate the whole entry, because dropping the entry would discard its authoritative `reinstateAuthority` alongside it and misreport the suspension tier. The unrecognized value is **replaced**, never retained, so it can never be rendered.

### 1.2 What the platform guarantees

| Fact                                                                        | Consequence for the portal                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Admission blocks Create and Update only; reads and deletes always work      | Nav stays enabled; deletes are never gated; a greyed sidebar would fake a lockout      |
| 403s carry `Cause{Type: "ProjectSuspended"}` in `Status.Details.Causes`     | Typed detection, no message-string matching                                            |
| `SelfSubjectAccessReview` is exempt from suspension admission               | The RBAC pre-flight keeps working inside a suspended project                           |
| Billing suspensions are consumer-remediable; Fraud/Abuse/Compliance are not | The CTA branches: "Review billing" vs. "Appeal this suspension"                        |
| Suspension never flips `Ready`                                              | The suspended state must be read from its own condition, never inferred from readiness |
| The `Suspended` condition `message` joins suspension **names**              | Never render it                                                                        |
| `status.suspensions[]` is active-only today (lift = delete upstream)        | No phase filtering needed today — but see [Known gaps](#known-gaps)                    |

### 1.3 The polarity trap

> On the `Suspended` condition, **`'False'` is the healthy state.** This is inverted relative to `Ready`, where `'False'` means not-yet-or-never healthy.

This is not a theoretical hazard. It shipped a bug once already, in the project creation watch path: code that treated _any_ condition with `status: 'False'` as a reconciliation failure caused create tasks to fail the moment `Suspended` flipped to `False` on a brand-new, perfectly healthy project. The fix and its warning still live in `app/resources/projects/project.watch.ts`:

```ts
/**
 * Only the Ready condition matters. Other conditions (e.g. Suspended=False with
 * reason Active / message "Project is active") are healthy signals and must not
 * abort the wait — treating any status=False as failure caused create tasks to
 * fail as soon as Suspended flipped to False.
 */
```

Every subsequent piece of suspension code is written defensively against this: `deriveSuspensionVerdict` requires an **explicit** `Suspended` condition lookup with `status === 'True'`, never a negation, never an inference from `Ready`, and never `transformControlPlaneStatus` (whose auto-detect ignores `Suspended` entirely, and whose non-`True` branch folds `condition.message` into its output — which would defeat redaction).

### 1.4 The redaction contract

Binding on every surface. Never render:

- the `Suspended` condition `message` (it joins internal suspension resource names),
- operator identity (`requestedBy`) or case notes (`description`) — omitted upstream, but never to be reintroduced,
- the raw reason enum values (`Fraud`, `Abuse`, …).

Reason enums map through `REASON_COPY` (`app/features/project/suspension/suspension-copy.ts`) to neutral, non-accusatory sentence fragments — `Fraud` becomes _"a security review of unusual account activity"_, because a fraud flag can be raised automatically before any human review, and the copy must not read as an accusation.

**The one permitted exception** is the HelpScout appeal prefill (`build-suspension-appeal-request.ts`), where the raw category is included in the message body so the support agent has the exact machine value:

```ts
const reasonLine = ctx.reasons.length > 0 ? ctx.reasons.join(', ') : 'not shown';
```

That text goes into a support ticket the user is composing, not into rendered product chrome.

Redaction is also enforced _below_ the render layer, so a call site cannot break it by accident. `ProjectReadOnlyError.message` carries the sanitized reason, which means even a hand-rolled `toast.error(title, { description: error.message })` stays redacted.

---

## Part 2 — Architecture

### 2.1 One verdict, no new fetch

The signal rides on the Project the portal already fetches. No new resource module, no new query, no watch bridge:

```
useProject()  →  ProjectProvider  →  useProjectSuspension()  →  SuspensionVerdict
                                  →  useProjectMode()        →  ProjectMode
```

`deriveSuspensionVerdict(status)` is the single source of truth for consumer-facing suspension state; call sites never re-derive it. Its rules:

1. `isSuspended` requires an explicit `Suspended` condition with `status === 'True'`.
2. No `Suspended` condition at all (feature gate off, older API, missing status) is deliberately **indistinguishable from healthy** to consumers — both mean "do not gate". Nothing needs to tell them apart.
3. The condition is authoritative for _whether_ suspended; `suspensions[]` only enriches _why_. `Suspended=True` with zero parseable entries yields a suspended verdict with `reasons: []` and generic copy — never a claimed category.
4. Unparseable entries are dropped individually, and **any** drop forces the conservative reinstatement tier rather than silently narrowing the sample `canSelfRemediate` is computed over.
5. `canSelfRemediate` is true only when the list is non-empty and every entry has `reinstateAuthority === 'Consumer'`. Mixed authorities → false: settling a bill does not lift a concurrent abuse suspension.

Rule 4 closes two real failure modes, both of which would mislead the user about what fixes their project:

- A lone entry carrying a reason milo added later used to fail `safeParse` outright, emptying `suspensions[]` and downgrading a _billing_ suspension to "Appeal" — steering the user away from the payment that would actually lift it.
- An unparseable `Operator` entry sitting beside a valid `Consumer` one used to vanish, leaving `every()` trivially true and falsely promising automatic reinstatement.

### 2.2 The read-only seam

`useProjectMode()` returns `{ isReadOnly: boolean; reason?: string }`. It is the **only** question call sites ask — never "is it suspended?".

```ts
// app/features/project/read-only/use-project-mode.ts
export function deriveProjectMode(status: unknown): ProjectMode {
  return deriveSuspensionVerdict(status).isSuspended
    ? { isReadOnly: true, reason: SUSPENDED_TOOLTIP }
    : WRITABLE;
}
```

Suspension is the only read-only source today. A second source (a future org-level freeze, a maintenance mode) is added _here_, and every consumer picks it up untouched. There is no registry, no config, and no speculative second state — the seam is one function.

Two properties are load-bearing:

- **It must not throw outside `ProjectProvider`.** Org-scoped pages share the same resource hooks, so it reads the context optionally (`useOptionalProjectContext`) and reports writable when there is no ambient project.
- **The pure derivation is split from the hook**, the same way `deriveSuspensionVerdict` splits from `useProjectSuspension`, so a caller that already read the project context derives the mode from that one read instead of triggering a second.

The toast path has the same seam: `showProjectReadOnlyToast` is what the gate calls, and it delegates to the suspension toast. A second read-only source adds its branch there, and nothing upstream changes.

### 2.3 The gate: `useGuardedMutation`

A drop-in wrapper over TanStack `useMutation` that requires an explicit `operation`:

```ts
useGuardedMutation({ operation: 'write' | 'delete', ...mutationOptions });
```

A `'write'` attempted while read-only never reaches the network: it rejects with a typed `ProjectReadOnlyError` and fires the sanitized toast.

Four decisions inside it are worth recording:

**Rejecting, not no-op'ing.** Existing `onError` paths keep working, `isError`/`isPending` stay coherent, and forms never hang in a submitting state.

**The caller's `onError` still runs for gated errors.** TanStack awaits `onMutate` _before_ the retryer invokes `mutationFn`, so a blocked write has already applied its optimistic cache write by the time the gate rejects. Short-circuiting the caller's `onError` would strand never-persisted values in the query cache — `useUpdateHttpProxy`, for instance, rolls back exclusively from its own `onError` and declares no `onSettled`, so its edits would render as saved until the next refetch. Duplicate messaging is solved at the toast layer instead (stable toast id), not by suppressing handlers.

**The gate is evaluated at `mutate()` time, not render time.** TanStack re-applies the options object on every render, so the closure always sees the current mode.

**Declaring the operation is mandatory.** The safe default is "blocked", and a new hook cannot be silently ungated by omission.

Adoption today: 12 `*.queries.ts` files, 25 `'write'` and 11 `'delete'` operations — covering dns-zones, dns-records, dns-zone-discoveries, domains, connectors, http-proxies, secrets, service-accounts, export-policies, notes, project-scoped policy-bindings, and the project settings update. Org-scoped resources (billing accounts, members, groups, invitations, payment methods, organizations, users) stay on plain `useMutation` by design.

### 2.4 The guards

The gate guarantees correctness but cannot disable a button — it has no idea what rendered it. `ReadOnlyGuard` does the opposite. Both are required; enumeration is only dangerous as the _sole_ line of defense.

`ReadOnlyGuard` mirrors `QuotaGuard` deliberately, including two subtleties:

- the happy path returns children with **no wrapper node**, so the common path never remounts,
- only a definitive `isReadOnly` gates — loading and unknown render children unmodified.

The composition order `PermissionGate → ReadOnlyGuard → QuotaGuard → leaf` is an invariant, not a preference. `PermissionGateProps` declares no `disabled` prop, so a `disabled` cloned onto it from outside is silently swallowed and the control stays keyboard-operable; it does clone `disabled: true` down onto its child. `GuardedWriteButton` encodes the order once for the common case, and `deriveGuardedAction` encodes the same **read-only > quota > permission** precedence for flat `{ disabled, tooltip }` action configs.

The full call-site guidance lives in [Gating Write Actions](../guides/gating-write-actions.md).

### 2.5 Error surfacing

Two producers, one sanitized toast, deduped on a stable id:

- **Client-side:** `useGuardedMutation` rejects with `ProjectReadOnlyError` before any request.
- **Server-side:** a write that 403s with `ProjectSuspended` — deep links, stale tabs, and races the guard cannot cover.

Server-side detection is typed, not string-matched. The axios interceptor already parses K8s `Status.details.causes[]` into `AppError.details` with `cause.reason → detail.code`, so:

```ts
export function isProjectSuspendedError(error: unknown): boolean {
  if (!(error instanceof AppError) || error.status !== 403) return false;
  return (error.details ?? []).some((d) => d.code === 'ProjectSuspended');
}
```

This is a deliberate contrast with quota error detection, whose message anchors its own README calls "not a contract".

`showMutationErrorToast` is the one entry point callers use. Suspension outranks quota inside it: a suspended project's writes 403 regardless of quota headroom.

### 2.6 Surfaces

| Surface                     | Behavior                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SuspensionBar`             | Full-width band under the header on every project page, via `DashboardLayout`'s `banner` slot. Amber, never red — suspension pauses work; nothing is deleted. Renders `null` unless definitively suspended. |
| Suspension CTA              | Branches on `canSelfRemediate`: "Review billing" for consumer-remediable, HelpScout appeal prefill otherwise.                                                                                               |
| Status badge                | `suspended` entry in `STATUS_CONFIG`; wins over `active`. Tooltip uses `REASON_COPY`, never the condition message.                                                                                          |
| Org project list / switcher | Suspended projects carry a warning indicator; the bar explains on arrival.                                                                                                                                  |
| Write affordances           | Disabled with a tooltip via `ReadOnlyGuard` / `GuardedWriteButton` / `deriveGuardedAction`.                                                                                                                 |
| Navigation                  | **Stays enabled.** Reads are guaranteed by the platform; a greyed sidebar would fake a lockout that does not exist.                                                                                         |

---

## Part 3 — Rationale for the rejected alternatives

### 3.1 Why the gate lives at the mutation layer, not the form layer

The obvious place to stop a write is where the user submits it. That option was evaluated and rejected.

The portal's form primitives — `Form.Root`, `Form.Submit`, and the field set — live in the **npm package `@datum-cloud/datum-ui`**, not in this repository. They are imported directly at **82 files** in `app/` (`@datum-cloud/datum-ui/form`; the design spec recorded ~80 at the time). There is no local wrapper module to patch.

That left two form-layer options:

**Option A: gate inside `@datum-cloud/datum-ui`.**

- **Pros:** one change, covers every form in every portal that consumes the design system.
- **Cons:** the design system would have to know about project suspension — a cloud-portal domain concept — which inverts the dependency direction. It is a separate repository, a separate release cycle, and a cross-portal blast radius for a single-portal problem.
- **Why rejected:** out of scope, and architecturally wrong: a design system must not depend on a consumer's domain model.

**Option B: build a local re-export layer over the design system's form exports, then gate in the wrapper.**

- **Pros:** keeps the change in-repo; gives a future hook point for other cross-cutting form concerns.
- **Cons:** a mechanical rewrite of 82 import sites, in the same PR as the behavior change, with no way to enforce that new code imports the wrapper rather than the package directly. It also only covers _forms_ — plenty of writes are fired from a button's `onClick` with no form at all.
- **Why rejected:** high-churn, incomplete coverage, and out of scope.

**The chosen layer — our own mutation hooks — has a property neither form-layer option has:** every project-scoped write in the portal passes through a hook in `app/resources/*/*.queries.ts`, whether it came from a form, a dropdown item, a row action, or a confirmation dialog. Wrapping ~30 hooks covers all of them, and covers every future call site of those hooks for free. It is also the layer where the "is this a write or a delete?" question is actually answerable.

The first pass at this feature gated per-button, by hand. It covered creates; edit and patch surfaces were missed; a sweep would have closed seven known holes and the next feature would have opened new ones. Enumeration cannot hold a line across 58 mutation hooks called from 64 files. This design inverts the default: project-scoped writes are blocked unless a hook explicitly declares itself a delete.

### 3.2 Why deletes are exempt

Milo's admission plugin blocks Create and Update only. Deletes are permitted during suspension, deliberately: a suspended customer must always be able to offboard — remove resources they are being billed for, revoke credentials, and leave.

If the portal gated deletes it would invent a restriction the API does not have, and it would do so on precisely the customers most likely to need it. So `operation: 'delete'` always passes through the gate, and delete affordances are not wrapped.

The corollary is that classification must follow **what the service method actually does**, not the hook's name. `useRevokeServiceAccountKey` is tagged `'delete'` because its service issues an HTTP DELETE, despite the name.

### 3.3 Why `app/features/`, not `app/modules/`

`app/modules/` is reserved for cross-cutting, multi-scope capability. Quota is multi-scope (org and project); RBAC is multi-scope. Suspension and read-only mode are **project-scoped only**, so they live in `app/features/project/suspension/` and `app/features/project/read-only/`. Cross-feature imports of the guard components are idiomatic in this codebase.

### 3.4 Why "read-only", not "suspended", in the consumer-facing API

The module is named for the question call sites ask — _"is this project read-only, and why?"_ — never _"is it suspended?"_. `SuspensionGuard` was renamed to `ReadOnlyGuard` for exactly this reason: a component that call sites use must not say "suspension" when the rule is that call sites never ask about suspension.

This is what makes the seam real rather than decorative. A second read-only source plugs into `deriveProjectMode` and `showProjectReadOnlyToast` without touching a single consumer.

---

## Known gaps

Stated honestly; none of these are blocking, all of them are real.

### No lint rule enforces `useGuardedMutation` in new resource files

The original design called for an ESLint rule banning raw `useMutation` inside project-scoped `app/resources/*/*.queries.ts`. It was not shipped, because neither available formulation is correct:

- **An explicit file list** (`no-restricted-imports` scoped to the 12 adopted files) enforces nothing where it matters. A brand-new resource file is not on the list, so the exact case the rule exists to catch — a new resource hook written with plain `useMutation` — passes silently.
- **A glob over `app/resources/*/*.queries.ts`** false-positives on every new org-scoped resource, where plain `useMutation` is the correct choice.

Project vs. org scope is **not derivable from a path**. `app/resources/policy-bindings/policy-binding.queries.ts` proves it: the same file holds `useCreatePolicyBinding` (org-scoped, plain `useMutation`) and `useCreateProjectPolicyBinding` (project-scoped, guarded). So does `project.queries.ts`, where `useUpdateProject` is gated but `useCreateProject` and `useDeleteProject` are not. A rule cannot infer scope from the filename, and a rule that demands an inline disable comment on every legitimate org hook is worse than no rule.

The mitigation today is the mandatory `operation` argument (a guarded hook cannot be half-adopted), plus [the guide's checklist](../guides/gating-write-actions.md#checklist). A correct rule would need to key off the hook's _parameters_ (does it take a `projectId`?) — an AST rule worth writing, but not written.

### Reinstatement is not live — it requires a refetch

There is no watch mounted for the Project resource on the project detail layout. `useProjectWatch` exists in `app/resources/projects/project.watch.ts` but has zero call sites; the layout uses `useProject(...)` with a `staleTime` and `refetchOnMount: false`.

Consequence: when an operator lifts a suspension, the user's open tab keeps showing the suspension bar and keeps blocking writes until the project query refetches (navigation, remount, or window refocus). The state is stale-but-safe rather than wrong — writes would succeed server-side, and the user only sees a client-side denial that clears on reload — but it is not the real-time behavior the quota layer gets from `QuotaWatchBridge`.

### The activity timeline (AC #2 of #1356) is blocked upstream

Suspend/Reinstate Events _are_ emitted by milo's propagator controller, but they land **untagged**: activity scope annotations are derived from the requesting user's parent context, and a controller has no parent context. Project-scoped activity queries (`scope_type = 'project'`) can therefore never match them, and scopes are not hierarchically inclusive.

Tracked as **milo-os/milo#749**. Once it deploys, suspension history surfaces on the standard project Activity page — no custom surface is planned.

### `status.suspensions[]` has no explicit phase contract

Today, lifting a suspension deletes the upstream resource, which keeps the projected list active-only. But the propagator appends entries regardless of `status.phase`, and `ProjectSuspensionInfo` carries no phase field. If lift ever becomes a phase change instead of a delete, consumer UIs will silently render stale suspensions as active. Raised with milo alongside the events issue; the portal has no defense against it because the information is not in the payload.

### No automated test coverage

Per an explicit standing decision on this work, verification was `bun run typecheck`, `bun run lint`, and a manual staging pass (gated writes blocked with no network request; deletes still working; org-level work unaffected while a project is suspended; healthy projects unchanged). E2E needs a suspended-project fixture, which requires staff credentials or the `ProjectSuspension` feature gate in a test environment.

If tests are ever revisited, **the inverted condition polarity is the first thing to cover** — it is the one rule in this system that has already caused a production bug.

---

## Appendix: source index

**Portal — suspension (state and presentation)**
`app/features/project/suspension/derive-suspension-verdict.ts` · `use-project-suspension.ts` ·
`suspension-copy.ts` · `suspension-tier.tsx` · `suspension-bar.tsx` · `suspension-cta.tsx` ·
`suspension-toast.ts` · `classify-suspension-error.ts` · `build-suspension-appeal-request.ts`

**Portal — read-only (gating)**
`app/features/project/read-only/README.md` · `use-project-mode.ts` · `use-guarded-mutation.ts` ·
`read-only-guard.tsx` · `guarded-write-button.tsx` · `derive-guarded-action.ts` ·
`project-read-only-error.ts` · `read-only-toast.ts`

**Portal — resources and providers**
`app/resources/projects/project.schema.ts` (suspension Zod slice) · `project.queries.ts` ·
`project.watch.ts` (the polarity-bug comment) · `app/providers/project.provider.tsx` ·
`app/resources/*/*.queries.ts` (12 adopted files) · `app/routes/project/detail/layout.tsx`

**Portal — composing layers**
`app/modules/quota/quota-toast.tsx` (`showMutationErrorToast`) · `app/modules/quota/components/QuotaGuard.tsx` ·
`app/modules/quota/README.md` · `app/modules/rbac/components/PermissionGate.tsx` ·
`app/modules/rbac/README.md` · `app/modules/axios/k8s-error.ts` · `app/utils/errors/app-error.ts` ·
`app/components/badge/badge-status.tsx` · `app/components/header/project-switcher.tsx`

**Milo backend**
`pkg/apis/resourcemanager/v1alpha1/project_types.go` (`ProjectSuspensionInfo`, `ProjectSuspendedCause`) ·
`internal/apiserver/admission/plugin/projectsuspension/admission.go` ·
`internal/controllers/resourcemanager/projectsuspension_propagator_controller.go` ·
`internal/apiserver/events/scope.go` (`injectScopeAnnotations` — the AC #2 blocker)

**Related documentation**
[Gating Write Actions](../guides/gating-write-actions.md) · [Quota-Aware UI Gating](./quota-aware-ui-gating.md) ·
[ADR-003: K8s Watch API Integration](../architecture/adrs/003-k8s-watch-api-integration.md)
