import { ReadOnlyGuard } from './read-only-guard';
import { QuotaGuard, type QuotaScope } from '@/modules/quota';
import { PermissionButton } from '@/modules/rbac';
import type { ComponentProps } from 'react';

export interface GuardedWriteButtonProps extends ComponentProps<typeof PermissionButton> {
  /**
   * Quota coordinates for the resource this button CREATES (for a cross-resource
   * action that is the created type, not the row it lives on). Omit on surfaces
   * with no live registration — the quota layer is then skipped entirely rather
   * than mounting a guard that can only no-op.
   */
  quota?: { resource: string; group: string; scope: QuotaScope };
}

/**
 * The one composition for a project-scoped write trigger:
 * `ReadOnlyGuard` → `QuotaGuard` → `PermissionButton`.
 *
 * That nesting order is an invariant, not a preference, and it was previously
 * hand-written at every write surface:
 * - ReadOnlyGuard OUTSIDE QuotaGuard, so the read-only message wins the tooltip
 *   on a dual denial. It still reaches the leaf because QuotaGuard forwards a
 *   received `disabled` onto its own child even when quota allows.
 * - PermissionButton as the leaf rather than PermissionGate wrapped around
 *   everything — PermissionGate declares no `disabled` prop, so a `disabled`
 *   cloned onto it is silently swallowed (see ReadOnlyGuard's docblock).
 *
 * Use this wherever the leaf is a PermissionButton. Surfaces whose leaf is a
 * plain Button or Form.Submit keep the explicit
 * `PermissionGate` → `ReadOnlyGuard` → leaf nesting, which this cannot express.
 */
export function GuardedWriteButton({ quota, ...permissionButtonProps }: GuardedWriteButtonProps) {
  const button = <PermissionButton {...permissionButtonProps} />;
  return (
    <ReadOnlyGuard>{quota ? <QuotaGuard {...quota}>{button}</QuotaGuard> : button}</ReadOnlyGuard>
  );
}
