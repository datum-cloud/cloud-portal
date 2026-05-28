import { usePermission } from '../hooks/usePermission';
import type { PermissionCheckScope, PermissionVerb } from '../types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { type ComponentProps } from 'react';

interface PermissionButtonProps extends ComponentProps<typeof Button> {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  name?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  projectId?: string;
  deniedReason?: string;
}

export function PermissionButton({
  resource,
  verb,
  group = '',
  name,
  namespace,
  scope,
  projectId,
  deniedReason,
  disabled,
  children,
  ...buttonProps
}: PermissionButtonProps) {
  const { hasPermission, isLoading } = usePermission(resource, verb, {
    group,
    name,
    namespace,
    scope,
    projectId,
  });
  const blocked = !hasPermission;

  const reason = isLoading
    ? 'Verifying permissions…'
    : (deniedReason ?? `You don't have permission to ${verb} ${resource}`);

  // Always wrap in Tooltip so the React tree stays stable across the
  // permission-loading → permission-resolved transition. Returning a bare
  // <Button> on the allowed branch and <Tooltip><Button/></Tooltip> on the
  // blocked branch remounts the Button DOM node when the query resolves,
  // which detaches it from any external reference (Cypress clicks, focus
  // restoration, refs in parent components).
  return (
    <Tooltip message={reason} hidden={!blocked}>
      <Button {...buttonProps} disabled={disabled || blocked}>
        {children}
      </Button>
    </Tooltip>
  );
}
