export interface GuardedActionInput {
  /** From `useProjectMode()`. */
  isReadOnly: boolean;
  readOnlyReason?: string;
  /** From `useResourceQuota().denied` / `.deniedReason`. Omit for unregistered surfaces. */
  quotaDenied?: boolean;
  quotaReason?: string;
  /** From `useResourcePermissions()`. Omit where the affordance is not RBAC-gated. */
  hasPermission?: boolean;
  permissionReason?: string;
}

export interface GuardedActionState {
  disabled: boolean;
  tooltip?: string;
}

/**
 * The read-only > quota > permission precedence, encoded once.
 *
 * `ReadOnlyGuard`/`QuotaGuard`/`PermissionButton` nest to express this for real
 * controls, but table empty-state and row actions take a flat
 * `{ disabled, tooltip }` pair instead of children — so they used to re-derive
 * the same ternary cascade by hand at five call sites. Divergence there is a
 * silent correctness bug: whichever message a copy of the cascade happens to
 * pick becomes the only explanation the user gets.
 *
 * Why this order: read-only outranks quota because the user's headroom is
 * irrelevant while every write is refused, and quota outranks permission
 * because "there's no capacity" is the actionable half of a dual denial (the
 * same rule `QuotaGuard`'s pointer-events-none wrapper enforces visually —
 * see app/modules/quota/README.md's dual-denial rule).
 *
 * Spread onto the action:
 * ```tsx
 * { type: 'button', label: 'Add zone', onClick, ...deriveGuardedAction({ … }) }
 * ```
 */
export function deriveGuardedAction({
  isReadOnly,
  readOnlyReason,
  quotaDenied = false,
  quotaReason,
  hasPermission = true,
  permissionReason,
}: GuardedActionInput): GuardedActionState {
  if (isReadOnly) return { disabled: true, tooltip: readOnlyReason };
  if (quotaDenied) return { disabled: true, tooltip: quotaReason };
  if (!hasPermission) return { disabled: true, tooltip: permissionReason };
  return { disabled: false, tooltip: undefined };
}
