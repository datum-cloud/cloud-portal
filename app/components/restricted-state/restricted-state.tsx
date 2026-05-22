import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { LockIcon } from 'lucide-react';

interface RestrictedStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function RestrictedState({
  title = 'Access restricted',
  message = "You don't have permission to view this.",
  className,
}: RestrictedStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center',
        className
      )}>
      <Icon icon={LockIcon} className="text-muted-foreground size-8 stroke-1" />
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
      </div>
    </div>
  );
}
