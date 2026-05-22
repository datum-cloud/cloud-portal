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

  const button = (
    <Button {...buttonProps} disabled={disabled || blocked}>
      {children}
    </Button>
  );

  if (!blocked) return button;

  const reason = isLoading
    ? 'Verifying permissions…'
    : (deniedReason ?? `You don't have permission to ${verb} ${resource}`);

  return <Tooltip message={reason}>{button}</Tooltip>;
}
