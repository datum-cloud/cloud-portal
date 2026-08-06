# Project Read-Only

Gates project-scoped **writes** while the project is in a write-blocked state.
Mirrors `app/modules/quota/README.md`'s shape deliberately — the two guards
compose, and the composition order is an invariant (see below).

Named for the question call sites ask — "is this project read-only, and why?",
never "is it suspended?". Suspension is the only source today; it lives in
`app/features/project/suspension/` and reaches this module through
`deriveProjectMode`. A second source is added there and every consumer picks it
up untouched.

## The gate contract

### Writes are blocked. Deletes are never blocked.

> `useGuardedMutation` requires an explicit `operation`. `'write'`
> (create/update/patch) is refused while read-only. `'delete'` **always** passes
> through.

The platform permits deletes during suspension so customers can offboard, and
the UI must not invent a restriction the API does not have. Declaring the
operation is mandatory precisely so the safe default is "blocked" and a new
hook cannot be silently ungated.

Classification follows the user-visible action, not the HTTP verb underneath:
`useUpdateHttpProxy` is `'write'` even though its service tears down
sub-resources with HTTP DELETEs, because the user is editing a proxy they are
keeping. Proxy offboarding is `useDeleteHttpProxy`, which is `'delete'`.

### Fail-safe direction: unknown means writable

> `isReadOnly` is `true` ONLY on an explicit `Suspended` condition with status
> `'True'`.

Missing status, absent condition, unparseable payload, or no ambient project all
resolve to **writable**. `useOptionalProjectContext` degrades instead of
throwing, because org-scoped pages share the same resource hooks. Loading must
never flash a blocked verdict.

Note the inverted polarity: on the `Suspended` condition, `'False'` is the
**healthy** state — the opposite of `Ready`.

### Redaction

The `Suspended` condition `message`, operator identity, case notes, and raw
reason enums are never rendered. `ProjectReadOnlyError.message` carries the
sanitized reason, so even a call site that hand-rolls
`toast.error(title, { description: error.message })` stays redacted. Server-side
403s are sanitized by `showMutationErrorToast`, which every project-scoped
mutation `onError` should route through.

## Two lines of defense

|                                        | Guarantees                                       | Cannot                                             |
| -------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `useGuardedMutation`                   | no unauthorized request leaves the client        | disable a button — it has no idea what rendered it |
| `ReadOnlyGuard` / `GuardedWriteButton` | the affordance is visibly disabled and explained | stop a deep link or a race                         |

Enumeration is only dangerous as the SOLE line of defense. Both are required.

## Guard composition order

> `PermissionGate` → `ReadOnlyGuard` → `QuotaGuard` → leaf

- **ReadOnlyGuard OUTSIDE QuotaGuard** so the read-only message wins the tooltip
  on a dual denial. It still reaches the leaf because QuotaGuard forwards a
  received `disabled` onto its own child even when quota allows.
- **ReadOnlyGuard INSIDE PermissionGate.** PermissionGate declares no `disabled`
  prop, so a `disabled` cloned onto it from outside is silently swallowed — the
  control would look enabled and stay keyboard-operable. It does clone
  `disabled: true` _down_ onto its child in `'disable'` mode, so the denial
  still arrives.
- **Guard the write, not its container.** Wrapping a component that also houses
  a read affordance (an Import/Export dropdown) disables the shared trigger and
  takes the read down with it. Push the guard in to the write half.

### `<GuardedWriteButton>`

Encodes that order once for the common case (leaf is a `PermissionButton`).
Omit `quota` on surfaces with no live registration.

```tsx
<GuardedWriteButton
  quota={{ resource: 'dnszones', group: 'dns.networking.miloapis.com', scope: 'project' }}
  resource="dnszones"
  verb="create"
  group="dns.networking.miloapis.com"
  scope="project"
  deniedReason="You don't have permission to add a DNS zone"
  onClick={…}>
  Add zone
</GuardedWriteButton>
```

Surfaces whose leaf is a plain `Button` or `Form.Submit` keep the explicit
`PermissionGate` → `ReadOnlyGuard` → leaf nesting, which this cannot express.

### `deriveGuardedAction({ … })`

The same **read-only > quota > permission** precedence for surfaces that take a
flat `{ disabled, tooltip }` pair instead of children — table empty-state and
row actions. Spread it; never re-derive the cascade by hand.

```tsx
{ type: 'button', label: 'Add zone', onClick, ...deriveGuardedAction({
    isReadOnly, readOnlyReason,
    quotaDenied, quotaReason,
    hasPermission: canCreate,
    permissionReason: "You don't have permission to add a DNS zone",
  }) }
```

## Exports

`useProjectMode()` / `deriveProjectMode(status)` (hook + pure derivation, split
the same way `useProjectSuspension` splits from `deriveSuspensionVerdict`),
`useGuardedMutation`, `ReadOnlyGuard`, `GuardedWriteButton`,
`deriveGuardedAction`, `ProjectReadOnlyError` / `isProjectReadOnlyError`, and
`showProjectReadOnlyToast` — the reason-agnostic seam the gate toasts through so
a future read-only source does not have to edit the gate.

## Import rules

Import from the barrel (`@/features/project/read-only`) from UI code. Two
deliberate exceptions keep deep paths:

- `app/resources/*/*.queries.ts` import `use-guarded-mutation` directly. The
  barrel re-exports React components, and dragging those into every data-layer
  module is a real bundle cost on a hot path.
- `app/modules/quota/quota-toast.tsx` imports the leaf error/toast modules.
  Going through the barrel would create a cycle, since `GuardedWriteButton`
  imports `@/modules/quota`.
