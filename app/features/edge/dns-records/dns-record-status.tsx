import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { BadgeStatus } from '@/components/badge/badge-status';
import { IExtendedControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_RECORD_STATUS_ROUTE_PATH } from '@/routes/api/dns-records/status';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

interface DnsRecordStatusProps {
  record: IFlattenedDnsRecord;
  projectId: string;
  className?: string;
}

/**
 * DNS Record Status Component
 *
 * Simplified status logic:
 * - status?.programmedReason === 'InvalidDNSRecordSet' → Show BadgeProgrammingError
 * - isProgrammed === true → No badge (success state), stop polling
 * - Other states → Show BadgeStatus with programmedReason as tooltip, start polling
 * - Discovery records → No badge
 */
export const DnsRecordStatus = ({ record, projectId, className }: DnsRecordStatusProps) => {
  const fetcher = useFetcher({ key: `dns-record-status-${record.recordSetName}` });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [extendedStatus, setExtendedStatus] = useState<IExtendedControlPlaneStatus>();

  // Initialize extended status from record fields (already extended)
  useEffect(() => {
    // If record has extended fields, use them directly
    if (record.status) {
      setExtendedStatus(record.status);
    }
  }, [record.status]);

  useEffect(() => {
    // Only set up polling for managed records that have recordSetId
    if (!projectId || !record.recordSetName) {
      return;
    }

    const loadStatus = () => {
      if (record.recordSetName && projectId) {
        fetcher.load(
          `${getPathWithParams(DNS_RECORD_STATUS_ROUTE_PATH, { id: record.recordSetName })}?projectId=${projectId}`
        );
      }
    };

    // Initial load if:
    // 1. No current status exists, or
    // 2. Current status is pending
    if (
      !record.status ||
      (!record.status?.isProgrammed && record.status?.programmedReason !== 'InvalidDNSRecordSet')
    ) {
      // Defer initial load to avoid state update before mount
      const timeoutId = setTimeout(loadStatus, 0);

      // Set up polling interval
      intervalRef.current = setInterval(loadStatus, 10000);

      // Clean up timeout on unmount
      return () => {
        clearTimeout(timeoutId);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectId, record]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const statusData = transformControlPlaneStatus(fetcher.data.data, {
        includeConditionDetails: true,
        requiredConditions: ['Accepted', 'Programmed'],
      });

      setExtendedStatus(statusData);
      if (
        (statusData.isProgrammed === true ||
          statusData.programmedReason === 'InvalidDNSRecordSet') &&
        intervalRef.current
      ) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [fetcher.data, fetcher.state, intervalRef]);

  if (extendedStatus?.isProgrammed) {
    return null;
  }

  // 2. Error state - show BadgeProgrammingError for InvalidDNSRecordSet
  if (extendedStatus?.programmedReason === 'InvalidDNSRecordSet') {
    return (
      <BadgeProgrammingError
        className={className}
        isProgrammed={extendedStatus?.isProgrammed}
        programmedReason={extendedStatus?.programmedReason}
        statusMessage={extendedStatus?.message}
        errorReasons={['InvalidDNSRecordSet']}
      />
    );
  }

  // 4. Other states (pending, other errors, unknown) - show BadgeStatus
  const tooltipText =
    extendedStatus?.message || extendedStatus?.programmedReason || 'DNS record is being validated';

  return (
    <BadgeStatus
      status={extendedStatus?.status}
      label="Validating"
      showIcon={true}
      showTooltip={true}
      tooltipText={tooltipText}
      className={className}
    />
  );
};
