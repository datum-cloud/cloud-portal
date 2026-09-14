import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { BadgeStatus } from '@/components/badge/badge-status';
import { ControlPlaneStatus } from '@/resources/base';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import {
  formatDnsError,
  formatDnsRecordConflictError,
  parseDnsRrsetConflict,
} from '@/utils/helpers/dns/error-formatting.helper';

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
 * - pre-existing RRset / InvalidDNSRecordSet / PDNSError → error badge
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

  const rawMessage = status.message || '';
  const rrsetConflict = parseDnsRrsetConflict(rawMessage);
  const isProgrammingError =
    status.programmedReason === 'InvalidDNSRecordSet' ||
    status.programmedReason === 'PDNSError' ||
    !!rrsetConflict;

  if (isProgrammingError) {
    const tooltip = rrsetConflict
      ? formatDnsRecordConflictError(rawMessage, { managedByAlb: record.managedByGateway })
      : formatDnsError(rawMessage) || `Programming failed: ${status.programmedReason}`;

    return (
      <BadgeProgrammingError
        className={className}
        isProgrammed={false}
        programmedReason={status.programmedReason || 'PDNSError'}
        statusMessage={tooltip}
        label={rrsetConflict ? 'Conflict' : 'Error'}
        errorReasons={null}
      />
    );
  }

  // Pending/other states - show BadgeStatus
  const tooltipText =
    (rawMessage ? formatDnsError(rawMessage) : undefined) ||
    status.programmedReason ||
    'DNS record is being validated';

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
