import { buildSuspensionAppealRequest } from './build-suspension-appeal-request';
import { openSupportMessage } from '@/utils/open-support-message';
import { toast } from '@datum-cloud/datum-ui/toast';

/**
 * Stable id so the toast is idempotent. One blocked write can reach this
 * function twice — once from the client-side gate's `onError` and once from a
 * caller's catch block routed through `showMutationErrorToast` — and sonner
 * updates the existing toast for a repeated id instead of stacking a second.
 */
const PROJECT_SUSPENDED_TOAST_ID = 'project-suspended';

/**
 * Sanitized "project is suspended" toast, shared by two producers:
 * - `useGuardedMutation`, client-side, before any request is made;
 * - a write that 403s with ProjectSuspended (deep links, races the guard misses).
 */
export function showProjectSuspendedToast(opts: { projectName?: string }): void {
  toast.error('This project is suspended', {
    id: PROJECT_SUSPENDED_TOAST_ID,
    description:
      'New changes are disabled while the suspension is active. Nothing has been deleted.',
    duration: 10_000,
    action: opts.projectName
      ? {
          label: 'Appeal',
          onClick: () =>
            openSupportMessage(
              buildSuspensionAppealRequest({ projectName: opts.projectName!, reasons: [] })
            ),
        }
      : undefined,
  });
}
