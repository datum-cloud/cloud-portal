import { useProjectMode } from './use-project-mode';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cloneElement, isValidElement, type ReactNode } from 'react';

export type ReadOnlyGuardMode = 'disable' | 'hide' | 'fallback';

export interface ReadOnlyGuardProps {
  /** Default: 'disable' */
  mode?: ReadOnlyGuardMode;
  /** Overrides the tooltip copy from useProjectMode().reason. */
  reason?: string;
  /**
   * Forwarded onto the child control even when the project is writable. An
   * outer gate (e.g. PermissionGate in 'disable' mode) clones `disabled` onto
   * this wrapper; without the pass-through the prop would be silently dropped
   * and the leaf control would stay enabled and keyboard-operable. Mirrors
   * QuotaGuard's `disabled` pass-through for the same reason.
   */
  disabled?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Disables write affordances while the project is read-only. Named for the
 * question call sites ask — never "is it suspended?" — so a future read-only
 * source plugs in without touching a single consumer.
 *
 * Mirrors QuotaGuard (app/modules/quota/components/QuotaGuard.tsx): the happy
 * path returns children with no wrapper node so the common path never remounts
 * (see RBAC #1273), and only a definitive isReadOnly gates — loading/unknown
 * render children unmodified. Compose OUTSIDE QuotaGuard so the read-only
 * message wins; the cloned `disabled` reaches the leaf control because
 * QuotaGuard forwards its `disabled` prop onto its own child even when quota
 * allows.
 *
 * Composition rule: this only disables a leaf that accepts `disabled`, so it
 * must sit adjacent to that leaf. PermissionGate declares no `disabled` prop at
 * all, so a `disabled` cloned ONTO it from outside is silently swallowed —
 * wrapping it leaves the control looking and behaving enabled apart from
 * `pointer-events-none`, which the keyboard walks straight past. It does,
 * however, clone `disabled: true` DOWN onto its own child in 'disable' mode.
 * So put ReadOnlyGuard INSIDE PermissionGate, never outside it: PermissionGate
 * pushes its denial down into this guard, and this guard's `disabled`
 * pass-through carries it the rest of the way to the leaf.
 *
 * Guard the write, not its container: wrapping a component that also houses a
 * read affordance (e.g. an Import/Export dropdown) disables the shared trigger
 * and takes the read down with it. Push the guard in to the write half instead.
 *
 * This is the complement to useGuardedMutation, not a duplicate of it: the
 * gate guarantees no unauthorized request leaves the client but cannot disable
 * a button (it has no idea what rendered it); the guard does the opposite.
 * Enumeration is only dangerous as the SOLE line of defense.
 */
export function ReadOnlyGuard({
  mode = 'disable',
  reason,
  disabled,
  fallback = null,
  children,
}: ReadOnlyGuardProps) {
  const { isReadOnly, reason: modeReason } = useProjectMode();
  if (!isReadOnly) {
    // Cloning (not wrapping) keeps the element type stable, so the common path
    // still never remounts; `disabled` stays undefined unless an outer gate set it.
    if (disabled !== undefined && isValidElement(children)) {
      return cloneElement(children as React.ReactElement<{ disabled?: boolean }>, { disabled });
    }
    return <>{children}</>;
  }
  if (mode === 'hide' || mode === 'fallback') return <>{fallback}</>;

  const disabledChild = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ disabled?: boolean }>, { disabled: true })
    : children;
  return (
    <Tooltip message={reason ?? modeReason ?? ''}>
      <span
        aria-disabled={true}
        className="inline-block cursor-not-allowed [&>*]:pointer-events-none">
        {disabledChild}
      </span>
    </Tooltip>
  );
}
