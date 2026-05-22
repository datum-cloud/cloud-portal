import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { LockIcon } from 'lucide-react';

interface RestrictedOverlayProps {
  message?: string | React.ReactNode;
  className?: string;
}

export function RestrictedOverlay({
  message = "You don't have permission to perform this action",
  className,
}: RestrictedOverlayProps) {
  return (
    <div
      className={cn(
        'bg-background/80 absolute inset-0 z-10 flex items-center justify-center gap-2 backdrop-blur-[1px]',
        className
      )}>
      <Icon icon={LockIcon} className="text-muted-foreground size-4" />
      {typeof message === 'string' ? (
        <span className="text-muted-foreground text-sm font-medium">{message}</span>
      ) : (
        message
      )}
    </div>
  );
}
