import { recordQuotaGateDenied } from '../observability/metrics';
import type { QuotaScope } from '../types';
import { useResourceQuota } from '../use-resource-quota';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cloneElement, isValidElement, useEffect, type ReactNode } from 'react';

export type QuotaGuardMode = 'disable' | 'hide' | 'fallback';

export interface QuotaGuardProps {
  resource: string;
  group: string;
  scope: QuotaScope;
  /** Default: 'disable' */
  mode?: QuotaGuardMode;
  /** Overrides the auto-derived tooltip copy. */
  reason?: string;
  /**
   * Forwarded onto the child control even when quota allows. An outer guard
   * (e.g. ReadOnlyGuard) clones `disabled` onto this wrapper; without the
   * pass-through the prop would be silently dropped and the leaf button would
   * stay enabled and keyboard-operable while suspended.
   */
  disabled?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function QuotaGuard({
  resource,
  group,
  scope,
  mode = 'disable',
  reason,
  disabled,
  fallback = null,
  children,
}: QuotaGuardProps) {
  const verdict = useResourceQuota({ resource, group, scope });
  // Fail-open: only a definitive exhausted verdict gates. Loading/unknown render children
  // unmodified — no wrapper, so the node never remounts on the common path (see RBAC #1273).
  const { denied } = verdict;

  useEffect(() => {
    if (denied) {
      recordQuotaGateDenied({
        resourceType: `${group}/${resource}`,
        allocated: verdict.allocated,
        limit: verdict.limit,
        scope,
      });
    }
  }, [denied, group, resource, scope, verdict.allocated, verdict.limit]);

  if (!denied) {
    // Cloning (not wrapping) keeps the element type stable, so the common path
    // still never remounts; `disabled` stays undefined unless an outer guard set it.
    if (disabled !== undefined && isValidElement(children)) {
      return cloneElement(children as React.ReactElement<{ disabled?: boolean }>, { disabled });
    }
    return <>{children}</>;
  }
  if (mode === 'hide' || mode === 'fallback') return <>{fallback}</>;

  const message = reason ?? verdict.deniedReason ?? '';
  const disabledChild = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ disabled?: boolean }>, { disabled: true })
    : children;
  // The pointer-events-none span also suppresses an inner PermissionButton tooltip —
  // on dual denial the quota message wins (documented rule; both statements are true).
  return (
    <Tooltip message={message}>
      <span
        aria-disabled={true}
        className="inline-block cursor-not-allowed [&>*]:pointer-events-none">
        {disabledChild}
      </span>
    </Tooltip>
  );
}
