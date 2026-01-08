import { ControlPlaneStatus, IControlPlaneStatus } from '@/resources/base';
import { Badge, type BadgeProps, Tooltip, SpinnerIcon } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { ReactNode } from 'react';

interface StatusConfig {
  badgeType?: BadgeProps['type'];
  badgeTheme?: BadgeProps['theme'];
  // Custom colors (overrides badgeType/badgeTheme if provided)
  customColor?: {
    border: string;
    text: string;
    bg: string;
  };
  icon?: ReactNode;
  defaultLabel: string;
}

// Centralized status configuration
// Customize colors here - all usages will inherit these settings
const STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    badgeType: 'success',
    badgeTheme: 'light',
    defaultLabel: 'Active',
  },
  pending: {
    // Option 1: Use existing Badge type/theme
    badgeType: 'info',
    badgeTheme: 'light',
    // Option 2: Use custom colors
    // customColor: {
    //   border: 'border-blue-500',
    //   text: 'text-blue-600 dark:text-blue-400',
    //   bg: 'bg-blue-500/20 dark:bg-blue-500/20',
    // },
    icon: (
      <SpinnerIcon
        size="xs"
        aria-hidden="true"
        indicatorClassName="text-primary"
        trackClassName="text-white"
      />
    ),
    defaultLabel: 'Pending',
  },
  error: {
    badgeType: 'danger',
    badgeTheme: 'light',
    defaultLabel: 'Failed',
  },
  inactive: {
    badgeType: 'secondary',
    badgeTheme: 'light',
    defaultLabel: 'Inactive',
  },
  success: {
    badgeType: 'success',
    badgeTheme: 'light',
    defaultLabel: 'Ready',
  },
  personal: {
    badgeType: 'primary',
    badgeTheme: 'light',
    defaultLabel: 'Personal',
  },
  standard: {
    badgeType: 'info',
    badgeTheme: 'light',
    defaultLabel: 'Standard',
  },
};

// Helper to map ControlPlaneStatus to BadgeStatusStatus
const mapControlPlaneStatus = (status: ControlPlaneStatus): string => {
  switch (status) {
    case ControlPlaneStatus.Success:
      return 'active';
    case ControlPlaneStatus.Pending:
      return 'pending';
    case ControlPlaneStatus.Error:
      return 'error';
    default:
      return 'inactive';
  }
};

export interface BadgeStatusProps {
  // Accept either new status string or legacy IControlPlaneStatus
  status?: string | IControlPlaneStatus;
  label?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
  tooltipText?: string | ReactNode;
  className?: string;
  // Override centralized config (use sparingly)
  badgeType?: BadgeProps['type'];
  badgeTheme?: BadgeProps['theme'];
  // Custom icon (overrides default config icon)
  customIcon?: ReactNode;
  tooltipContentClassName?: string;
  tooltipArrowClassName?: string;
}

export const BadgeStatus = ({
  status,
  label,
  showIcon = false,
  showTooltip = true,
  tooltipText,
  className,
  badgeType: overrideBadgeType,
  badgeTheme: overrideBadgeTheme,
  tooltipContentClassName,
  tooltipArrowClassName,
  customIcon,
}: BadgeStatusProps) => {
  // Handle legacy IControlPlaneStatus format
  let statusValue: string;
  let statusMessage: string | undefined;

  if (!status) return null;

  if (typeof status === 'object' && 'status' in status) {
    // Legacy format: IControlPlaneStatus
    statusValue = mapControlPlaneStatus(status.status);
    statusMessage = status.message;
  } else {
    // New format: BadgeStatusStatus string
    statusValue = status;
  }

  const config = STATUS_CONFIG[statusValue.toLowerCase()];
  if (!config) return null;

  // Determine badge props
  const badgeType = overrideBadgeType ?? config.badgeType;
  const badgeTheme = overrideBadgeTheme ?? config.badgeTheme;
  const displayLabel = label ?? config.defaultLabel;
  const finalTooltipText = tooltipText ?? statusMessage;

  // Build className for custom colors
  const customColorClasses = config.customColor
    ? cn(
        config.customColor.border,
        config.customColor.text,
        config.customColor.bg,
        'border' // Ensure border is shown
      )
    : undefined;

  const badgeContent = (
    <Badge
      type={badgeType}
      theme={badgeTheme}
      className={cn(
        'text-2xs flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold tracking-[0.03em] uppercase',
        customColorClasses,
        className
      )}>
      {showIcon && (customIcon || config.icon)}
      {displayLabel}
    </Badge>
  );

  // Wrap with tooltip if needed
  if (showTooltip && finalTooltipText && statusValue !== 'active') {
    return (
      <div className="w-fit">
        <Tooltip
          message={finalTooltipText}
          contentClassName={tooltipContentClassName}
          arrowClassName={tooltipArrowClassName}>
          {badgeContent}
        </Tooltip>
      </div>
    );
  }

  // Wrap in container to prevent stretching in table cells
  return <div className="w-fit">{badgeContent}</div>;
};
