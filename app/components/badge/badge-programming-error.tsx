import { BadgeStatus } from '@/components/badge/badge-status';
import { TriangleAlertIcon } from 'lucide-react';

/**
 * Common programming error reasons from K8s Programmed condition
 * These are the default error reasons that trigger the error badge
 */
const DEFAULT_ERROR_REASONS: string[] = [
  'InvalidDNSRecordSet',
  'ProgrammingFailed',
  'ConfigurationError',
  'ValidationFailed',
];

/**
 * Props for programming error badge
 * Displays K8s Programmed condition errors
 */
export interface BadgeProgrammingErrorProps {
  isProgrammed?: boolean;
  programmedReason?: string;
  statusMessage?: string;
  className?: string;
  /**
   * List of error reasons that should trigger the error badge
   * @default ['InvalidDNSRecordSet', 'ProgrammingFailed', 'ConfigurationError', 'ValidationFailed']
   *
   * @example
   * // Custom error reasons for specific use case
   * errorReasons={['InvalidConfiguration', 'SyncFailed']}
   *
   * @example
   * // Show error for any reason (no filtering)
   * errorReasons={null}
   */
  errorReasons?: string[] | null;
}

/**
 * Specialized badge for K8s Programmed condition errors
 *
 * Shows error badge when:
 * - isProgrammed === false
 * - programmedReason matches configured error patterns (or any reason if errorReasons is null)
 *
 * @example Basic usage with default error reasons
 * <BadgeProgrammingError
 *   isProgrammed={record.isProgrammed}
 *   programmedReason={record.programmedReason}
 *   statusMessage={record.statusMessage}
 * />
 *
 * @example Custom error reasons
 * <BadgeProgrammingError
 *   isProgrammed={record.isProgrammed}
 *   programmedReason={record.programmedReason}
 *   statusMessage={record.statusMessage}
 *   errorReasons={['InvalidConfiguration', 'SyncFailed']}
 * />
 *
 * @example Show all programming errors (no filtering)
 * <BadgeProgrammingError
 *   isProgrammed={record.isProgrammed}
 *   programmedReason={record.programmedReason}
 *   statusMessage={record.statusMessage}
 *   errorReasons={null}
 * />
 */
export const BadgeProgrammingError = ({
  isProgrammed,
  programmedReason,
  statusMessage,
  className,
  errorReasons = DEFAULT_ERROR_REASONS,
}: BadgeProgrammingErrorProps) => {
  // Only show when there's a programming error
  if (isProgrammed !== false || !programmedReason) {
    return null;
  }

  // If errorReasons is null, show error for any reason (no filtering)
  // Otherwise, check if programmedReason matches the allowed list
  const shouldShowError = errorReasons === null || errorReasons.includes(programmedReason);

  if (!shouldShowError) {
    return null;
  }

  return (
    <BadgeStatus
      status="error"
      label="Error"
      tooltipText={statusMessage || `Programming failed: ${programmedReason}`}
      showTooltip={true}
      showIcon={true}
      customIcon={<TriangleAlertIcon className="size-3" />}
      badgeType="danger"
      badgeTheme="solid"
      className={className}
      tooltipContentClassName="max-w-64 bg-card text-destructive border"
      tooltipArrowClassName="fill-card drop-shadow-[0_1px_0_var(--border)]"
    />
  );
};
