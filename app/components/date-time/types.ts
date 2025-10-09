export type DateTimeVariant = 'absolute' | 'relative' | 'both';

export type TooltipMode = boolean | 'auto' | 'timezone' | 'alternate';

export interface DateTimeProps {
  /** The date to format - can be a Date object or ISO string */
  date: string | Date;

  /** Display variant - absolute shows formatted date, relative shows "X ago", both shows combined */
  variant?: DateTimeVariant;

  /** Custom format string for absolute dates (uses date-fns format tokens) */
  format?: string;

  /** Add "ago" suffix for relative dates */
  addSuffix?: boolean;

  /** Tooltip behavior:
   * - true/false: show/hide tooltip
   * - 'auto': intelligent default based on variant
   * - 'timezone': show timezone info
   * - 'alternate': show opposite format
   */
  tooltip?: TooltipMode;

  /** Custom timezone (defaults to user preference or UTC) */
  timezone?: string;

  /** Disable timezone conversion */
  disableTimezone?: boolean;

  /** CSS class name */
  className?: string;

  /** Separator text when variant="both" */
  separator?: string;

  /** Disable hydration mismatch protection (useful for SSR) */
  disableHydrationProtection?: boolean;

  /** Hide tooltip (legacy prop from DateFormat) */
  showTooltip?: boolean;
}

export interface FormatterOptions {
  timezone: string;
  disableTimezone: boolean;
  format?: string;
  addSuffix?: boolean;
}
