import { CardFieldLabel } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

/** CardFieldLabel with an optional help tooltip — portal-only, Tooltip stays out of datum-ui Card. */
export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <CardFieldLabel>
      {children}
      {hint ? (
        <Tooltip message={hint} side="bottom" contentClassName="max-w-xs text-wrap">
          <Icon icon={CircleHelp} className="text-muted-foreground size-3.5 shrink-0 cursor-help" />
        </Tooltip>
      ) : null}
    </CardFieldLabel>
  );
}
