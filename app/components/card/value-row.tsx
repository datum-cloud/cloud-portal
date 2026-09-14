import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * List row for a hostname or origin. The value is the primary content and
 * can use the full card width; status chips sit underneath so they never
 * fight the hostname for a 50/50 column. Trailing actions stay pinned to
 * the hostname line.
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
    <div className="border-card-border group/row mx-(--card-px) flex items-start gap-3 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* min-h-7 matches the action control so the hostname and menu share a midline. */}
        <div className="flex min-h-7 min-w-0 items-center">
          <div className="min-w-0 truncate font-mono text-sm">
            <Tooltip message={value}>
              <span>{value}</span>
            </Tooltip>
          </div>
        </div>
        {status ? <div className="flex flex-wrap items-center gap-1.5">{status}</div> : null}
      </div>
      <div className="flex h-7 shrink-0 items-center justify-end gap-1">
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
    </div>
  );
}
