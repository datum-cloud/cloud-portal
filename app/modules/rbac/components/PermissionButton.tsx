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

  const button = (
    <Button {...buttonProps} disabled={disabled || !hasPermission}>
      {children}
    </Button>
  );

  // Render the bare Button while the check is in flight AND once it resolves to
  // allowed, toggling only `disabled`. The allowed transition therefore never
  // remounts the node — that remount is what detached in-flight clicks (the e2e
  // "page updated while executing" flake addressed in #1273) — and the permitted
  // case keeps its natural layout (no Tooltip wrapper, so `w-full sm:w-auto`
  // create buttons stay full-width on mobile and pages avoid Radix Tooltip
  // overhead on every gated button). Only a definitively denied action gets
  // wrapped in the explanatory Tooltip; it stays disabled, so nothing clicks it.
  if (isLoading || hasPermission) return button;

  const reason = deniedReason ?? `You don't have permission to ${verb} ${resource}`;
  return <Tooltip message={reason}>{button}</Tooltip>;
}
