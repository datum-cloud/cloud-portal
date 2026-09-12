import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface OverviewEmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Centered icon + heading + hint used by the overview panels when idle. */
export function OverviewEmptyState({
  icon,
  title,
  description,
  children,
  className,
}: OverviewEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-3 px-(--card-px) py-8 text-center',
        className
      )}>
      <span className="bg-muted flex size-10 items-center justify-center rounded-full">
        <Icon icon={icon} size={18} className="text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground max-w-xs text-xs">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Small "● Idle" chip shown beside a panel title when it has nothing live. */
export function IdleChip({ className }: { className?: string }) {
  return (
    <Badge
      type="muted"
      theme="solid"
      className={cn(
        'h-5 gap-1.5 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap',
        className
      )}>
      <span className="bg-muted-foreground/60 size-1.5 rounded-full" aria-hidden="true" />
      Idle
    </Badge>
  );
}
