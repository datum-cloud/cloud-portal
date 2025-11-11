import {
  formatAbsoluteDate,
  formatCombinedDate,
  formatRelativeDate,
  getTimezoneAbbreviation,
  parseDate,
} from './formatters';
import type { DateTimeProps, FormatterOptions } from './types';
import { useApp } from '@/providers/app.provider';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { useEffect, useState } from 'react';

/**
 * Unified component for displaying dates in absolute, relative, or combined formats
 * with intelligent tooltip support and timezone awareness.
 *
 * @example
 * // Absolute date
 * <DateTime date={createdAt} />
 *
 * @example
 * // Relative time
 * <DateTime date={createdAt} variant="relative" />
 *
 * @example
 * // Combined format
 * <DateTime date={createdAt} variant="both" />
 */
export const DateTime = ({
  date,
  variant = 'absolute',
  format,
  addSuffix,
  tooltip = 'auto',
  timezone,
  disableTimezone = false,
  className,
  separator = ' ',
  disableHydrationProtection = false,
  showTooltip = true, // Legacy prop from DateFormat
}: DateTimeProps) => {
  const { userPreferences } = useApp();
  const [mounted, setMounted] = useState(false);

  // Hydration protection for relative dates (client-side only)
  const needsHydrationProtection = variant === 'relative' || variant === 'both';

  useEffect(() => {
    if (needsHydrationProtection && !disableHydrationProtection) {
      setMounted(true);
    }
  }, [needsHydrationProtection, disableHydrationProtection]);

  // Parse and validate date
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return null;
  }

  // Show loading state during hydration
  if (needsHydrationProtection && !disableHydrationProtection && !mounted) {
    return <span className={className}>...</span>;
  }

  // Prepare formatter options
  const timeZone = timezone ?? userPreferences?.timezone ?? getBrowserTimezone();
  const formatterOptions: FormatterOptions = {
    timezone: timeZone,
    disableTimezone,
    format,
    addSuffix,
  };

  // Format the main content
  let content: string;
  switch (variant) {
    case 'relative':
      content = formatRelativeDate(parsedDate, formatterOptions);
      break;
    case 'both':
      content = formatCombinedDate(parsedDate, formatterOptions, separator);
      break;
    case 'absolute':
    default:
      content = formatAbsoluteDate(parsedDate, formatterOptions);
      break;
  }

  // Determine tooltip behavior
  const shouldShowTooltip = determineTooltipVisibility(tooltip, showTooltip);

  if (!shouldShowTooltip || disableTimezone) {
    return <span className={cn(className)}>{content}</span>;
  }

  // Determine tooltip content
  const tooltipContent = getTooltipContent(
    parsedDate,
    variant,
    tooltip,
    formatterOptions,
    timeZone
  );

  return (
    <Tooltip message={tooltipContent}>
      <span className={cn('cursor-pointer', className)}>{content}</span>
    </Tooltip>
  );
};

/**
 * Determines if tooltip should be shown
 */
function determineTooltipVisibility(
  tooltip: DateTimeProps['tooltip'],
  showTooltip: boolean
): boolean {
  if (typeof tooltip === 'boolean') {
    return tooltip;
  }

  // Legacy support for showTooltip prop
  if (tooltip === 'auto' && !showTooltip) {
    return false;
  }

  // Auto mode shows tooltip by default
  return true;
}

/**
 * Gets the appropriate tooltip content based on variant and mode
 */
function getTooltipContent(
  date: Date,
  variant: DateTimeProps['variant'],
  tooltip: DateTimeProps['tooltip'],
  options: FormatterOptions,
  timeZone: string
): React.ReactNode {
  // Explicit timezone mode
  if (tooltip === 'timezone') {
    return (
      <p>
        {timeZone.replace('_', ' ')}&nbsp; ({getTimezoneAbbreviation(date, timeZone)})
      </p>
    );
  }

  // Alternate mode - show opposite format
  if (tooltip === 'alternate') {
    if (variant === 'relative') {
      return formatAbsoluteDate(date, options);
    }
    if (variant === 'absolute' || variant === 'both') {
      return formatRelativeDate(date, options);
    }
  }

  // Auto mode - intelligent defaults
  if (tooltip === 'auto' || tooltip === true) {
    switch (variant) {
      case 'relative':
        // Show absolute date for relative time
        return formatAbsoluteDate(date, options);

      case 'both':
      case 'absolute':
      default:
        // Show timezone info for absolute dates
        return (
          <p>
            {timeZone.replace('_', ' ')}&nbsp; ({getTimezoneAbbreviation(date, timeZone)})
          </p>
        );
    }
  }

  return null;
}
