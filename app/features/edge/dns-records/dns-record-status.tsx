import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { BadgeStatus } from '@/components/badge/badge-status';
import { ControlPlaneStatus } from '@/resources/base';
import { IFlattenedDnsRecord } from '@/resources/dns-records';

interface DnsRecordStatusProps {
  record: IFlattenedDnsRecord;
  projectId: string;
  className?: string;
}

/**
 * DNS Record Status Component
 *
 * Displays the current status of a DNS record based on watch data.
 * Status is updated in real-time via K8s Watch API.
 *
 * Status logic:
 * - isProgrammed === true → No badge (success state)
 * - programmedReason === 'InvalidDNSRecordSet' or 'PDNSError' → Show BadgeProgrammingError
 * - Other states → Show BadgeStatus with "Validating" label
 */
export const DnsRecordStatus = ({ record, className }: DnsRecordStatusProps) => {
  const status = record.status;

  // No status yet - show validating
  if (!status) {
    return (
      <BadgeStatus
        status={ControlPlaneStatus.Pending}
        label="Validating"
        showIcon={true}
        showTooltip={true}
        tooltipText="DNS record is being validated"
        className={className}
      />
    );
  }

  // Success state - no badge
  if (status.isProgrammed) {
    return null;
  }

  // Error state - show BadgeProgrammingError
  if (
    status.programmedReason === 'InvalidDNSRecordSet' ||
    status.programmedReason === 'PDNSError'
  ) {
    return (
      <BadgeProgrammingError
        className={className}
        isProgrammed={status.isProgrammed}
        programmedReason={status.programmedReason}
        statusMessage={status.message}
        errorReasons={['InvalidDNSRecordSet', 'PDNSError']}
      />
    );
  }

  // Pending/other states - show BadgeStatus
  const tooltipText = status.message || status.programmedReason || 'DNS record is being validated';

  return (
    <BadgeStatus
      status={status.status}
      label="Validating"
      showIcon={true}
      showTooltip={true}
      tooltipText={tooltipText}
      className={className}
    />
  );
};
