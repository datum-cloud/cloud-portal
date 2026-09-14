import { Button } from '@datum-cloud/datum-ui/button';
import { CardField, CardFieldLabel, CardFieldValue } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One value row (hostname, origin, …) on the shared `CardField` grid, so the
 * status column starts where the value column does on the other configuration
 * cards. Status chips and the trailing action live in that column; a
 * desktop-only copy button reveals on hover.
 */
export function ValueRow({
  value,
  status,
  action,
  onCopy,
  copied,
}: {
  value: string;
  status?: ReactNode;
  action?: ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <CardField className="group/row">
      {/* Tooltip wraps its trigger in an unconstrained inline-flex span, so the
          truncation has to live on an outer block that the grid column can shrink. */}
      <CardFieldLabel className="font-normal">
        <div className="max-w-full min-w-0 truncate font-mono text-sm">
          <Tooltip message={value}>
            <span>{value}</span>
          </Tooltip>
        </div>
      </CardFieldLabel>
      <CardFieldValue className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{status}</div>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {onCopy ? (
            // Desktop-only inline copy; on small screens a row menu carries it.
            <Button
              type="quaternary"
              theme="borderless"
              size="xs"
              className={cn(
                'text-muted-foreground hidden size-7 p-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:inline-flex',
                copied && 'opacity-100'
              )}
              aria-label={copied ? 'Copied' : `Copy ${value}`}
              onClick={onCopy}>
              <Icon icon={copied ? CheckIcon : CopyIcon} size={14} />
            </Button>
          ) : null}
          {action ? <div className="flex size-7 items-center justify-end">{action}</div> : null}
        </div>
      </CardFieldValue>
    </CardField>
  );
}
