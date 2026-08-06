import { showProjectSuspendedToast } from '@/features/project/suspension/suspension-toast';

/**
 * Reason-agnostic seam for "this write was refused because the project is
 * read-only". The gate (`useGuardedMutation`) calls THIS, never a
 * suspension-specific toast, so `useProjectMode`'s promise — that a future
 * read-only source plugs in without touching any consumer — holds for the gate
 * too, not just for UI consumers.
 *
 * Suspension is the only read-only source today, so this delegates. A second
 * source adds its branch here, keyed off the reason that `deriveProjectMode`
 * already returns, and nothing upstream of this file changes.
 */
export function showProjectReadOnlyToast(opts: { projectName?: string }): void {
  showProjectSuspendedToast(opts);
}
