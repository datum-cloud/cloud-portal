import { Badge } from '@datum-cloud/datum-ui/badge';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import type { ReactNode } from 'react';

export type StatusChipTone = 'success' | 'warning' | 'danger' | 'muted';

/**
 * Compact status pill used on the ALB overview and configuration cards so
 * hostname / TLS / DNS states read the same wherever they appear.
 */
export function StatusChip({
  tone,
  children,
  tooltip,
  busy,
}: {
  tone: StatusChipTone;
  children: ReactNode;
  tooltip?: string;
  busy?: boolean;
}) {
  const chip = (
    <Badge
      type={tone}
      // Muted/light is near-invisible in light mode; solid muted stays legible.
      theme={tone === 'muted' ? 'solid' : 'light'}
      className="h-5 gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap">
      {busy ? <SpinnerIcon size="xs" aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
  return tooltip ? <Tooltip message={tooltip}>{chip}</Tooltip> : chip;
}
