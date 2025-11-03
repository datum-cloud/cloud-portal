import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import { Badge } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';
import { CircleIcon, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

// Nano component: Status Dot
export const StatusDot = ({
  status,
  className,
}: {
  status: ControlPlaneStatus;
  className?: string;
}) => {
  if (status === ControlPlaneStatus.Success) {
    return (
      <CircleIcon
        className={cn('size-3 cursor-default fill-green-500 text-green-500', className)}
        aria-hidden="true"
      />
    );
  }

  if (status === ControlPlaneStatus.Error) {
    return (
      <CircleIcon
        className={cn('size-3 cursor-default fill-red-500 text-red-500', className)}
        aria-hidden="true"
      />
    );
  }

  if (status === ControlPlaneStatus.Pending) {
    return <Loader2 className={cn('size-3 animate-spin cursor-default', className)} />;
  }

  return null;
};

// Nano component: Status Text
export const StatusText = ({
  status,
  pendingText = 'Setting up...',
  errorText = 'Failed',
  readyText = 'Ready',
}: {
  status: ControlPlaneStatus;
  pendingText?: string;
  errorText?: string;
  readyText?: string;
}) => {
  if (status === ControlPlaneStatus.Success) return readyText;
  if (status === ControlPlaneStatus.Error) return errorText;
  return pendingText;
};

// Nano component: Status Badge (just the badge wrapper)
export const StatusBadgeWrapper = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <Badge
    variant="outline"
    className={cn(
      'flex cursor-default items-center gap-1 border-none px-0 text-sm font-normal',
      className
    )}>
    {children}
  </Badge>
);

// Nano component: Status Tooltip Wrapper
export const StatusTooltipWrapper = ({
  children,
  tooltipText,
  showTooltip = true,
  status,
}: {
  children: ReactNode;
  tooltipText?: string | ReactNode;
  showTooltip?: boolean;
  status: ControlPlaneStatus;
}) => (
  <Tooltip>
    <TooltipTrigger
      className={cn(
        'w-fit',
        !showTooltip || status === ControlPlaneStatus.Success ? 'pointer-events-none' : ''
      )}>
      {children}
    </TooltipTrigger>
    <TooltipContent>{tooltipText}</TooltipContent>
  </Tooltip>
);

// Composed component: Full Status Badge (for backward compatibility)
export const StatusBadge = ({
  status,
  type = 'dot',
  showTooltip = true,
  badgeClassName,
  pendingText = 'Setting up...',
  errorText = 'Failed',
  readyText = 'Ready',
  tooltipText,
}: {
  status?: IControlPlaneStatus;
  type?: 'dot' | 'badge';
  showTooltip?: boolean;
  badgeClassName?: string;
  pendingText?: string;
  errorText?: string;
  readyText?: string;
  tooltipText?: string | ReactNode;
}) => {
  if (!status) return null;

  const content =
    type === 'dot' ? (
      <StatusDot status={status.status} />
    ) : (
      <StatusBadgeWrapper className={badgeClassName}>
        <StatusDot status={status.status} />
        <StatusText
          status={status.status}
          pendingText={pendingText}
          errorText={errorText}
          readyText={readyText}
        />
      </StatusBadgeWrapper>
    );

  return (
    <StatusTooltipWrapper
      tooltipText={tooltipText ?? status.message}
      showTooltip={showTooltip}
      status={status.status}>
      {content}
    </StatusTooltipWrapper>
  );
};
