import { usePermission } from '../hooks/usePermission';
import type { PermissionCheckScope, PermissionVerb } from '../types';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cloneElement, isValidElement, type ReactNode } from 'react';

export type PermissionGateMode = 'hide' | 'disable' | 'fallback';

export interface PermissionGateProps {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  name?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  projectId?: string;
  /** Default: 'hide' */
  mode?: PermissionGateMode;
  /** Tooltip text in 'disable' mode. Auto-derived if omitted. */
  deniedReason?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  resource,
  verb,
  group = '',
  name,
  namespace,
  scope,
  projectId,
  mode = 'hide',
  deniedReason,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermission(resource, verb, {
    group,
    name,
    namespace,
    scope,
    projectId,
  });

  if (hasPermission) {
    return <>{children}</>;
  }

  if (mode === 'fallback') {
    return <>{fallback}</>;
  }

  if (mode === 'disable') {
    const reason = isLoading
      ? 'Verifying permissions…'
      : (deniedReason ?? `You don't have permission to ${verb} ${resource}`);
    const disabledChild = isValidElement(children)
      ? cloneElement(children as React.ReactElement<{ disabled?: boolean }>, { disabled: true })
      : children;
    return (
      <Tooltip message={reason}>
        <span
          aria-disabled={true}
          className="inline-block cursor-not-allowed [&>*]:pointer-events-none">
          {disabledChild}
        </span>
      </Tooltip>
    );
  }

  // 'hide'
  return <>{fallback}</>;
}
