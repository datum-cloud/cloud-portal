import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { BadgeStatus } from '@/components/badge/badge-status';
import {
  ControlPlaneStatus,
  IExtendedControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
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
 * Process DNS record status from raw API response
 * Extracts and matches recordSet conditions to the current record
 *
 * @param rawStatus - Raw status object from API
 * @param record - The DNS record to match against
 * @returns Processed status information
 */
function processDnsRecordStatus(
  rawStatus: any,
  record: IFlattenedDnsRecord
): {
  extendedStatus: IExtendedControlPlaneStatus | undefined;
  hasRecordSetError: boolean;
  hasOtherRecordSetErrors: boolean;
  shouldStopPolling: boolean;
} {
  const recordSets = rawStatus?.recordSets || [];

  // Transform status for compatibility
  const statusData = transformControlPlaneStatus(rawStatus, {
    includeConditionDetails: true,
    requiredConditions: ['Accepted', 'Programmed'],
  });

  // Add recordSets to statusData for reference
  statusData.recordSets = recordSets.map((recordSet: any) => ({
    name: recordSet.name,
    conditions: recordSet.conditions?.map((condition: any) => ({
      type: condition.type,
      status: condition.status,
      reason: condition.reason,
      message: condition.message,
      lastTransitionTime: condition.lastTransitionTime,
      observedGeneration: condition.observedGeneration,
    })),
  }));

  // Find recordSet conditions with status 'False' (ignore top-level conditions)
  const falseRecordSetConditions = recordSets.flatMap((recordSet: any) =>
    (recordSet.conditions || [])
      .filter((condition: any) => condition.status === 'False')
      .map((condition: any) => ({
        ...condition,
        recordSetName: recordSet.name,
      }))
  );

  // Find conditions that match this specific record
  // recordSets are grouped by (type, name) - all records with the same name and type share status
  // Match by recordSet name to record name (normalize by removing trailing dots)
  const normalizedRecordName = record.name.replace(/\.$/, '').toLowerCase();
  const matchingConditions = falseRecordSetConditions.filter((condition: any) => {
    // Match the recordSet name (which is the owner name) to the record name
    const recordSetName = (condition.recordSetName || '').replace(/\.$/, '').toLowerCase();
    return recordSetName === normalizedRecordName || recordSetName === record.name.toLowerCase();
  });

  // If we have matching false conditions in recordSets, use those for status
  if (matchingConditions.length > 0) {
    // Use the first matching condition's reason and message
    const firstMatchingCondition = matchingConditions[0];
    const isErrorReason =
      firstMatchingCondition.reason === 'InvalidDNSRecordSet' ||
      firstMatchingCondition.reason === 'PDNSError';

    const updatedStatus: IExtendedControlPlaneStatus = {
      ...statusData,
      status: ControlPlaneStatus.Pending,
      message: firstMatchingCondition.message || statusData.message,
      programmedReason: firstMatchingCondition.reason || statusData.programmedReason,
      isProgrammed: false, // If there's a False condition, it's not programmed
    };

    return {
      extendedStatus: updatedStatus,
      hasRecordSetError: isErrorReason,
      hasOtherRecordSetErrors: false,
      shouldStopPolling: isErrorReason,
    };
  }

  // There are errors in recordSets but they don't match this record
  if (falseRecordSetConditions.length > 0) {
    return {
      extendedStatus: undefined,
      hasRecordSetError: false,
      hasOtherRecordSetErrors: true,
      shouldStopPolling: false,
    };
  }

  // No false conditions in recordSets - check if all are True (success)
  if (recordSets.length > 0) {
    const allRecordSetConditionsTrue = recordSets.every((recordSet: any) =>
      (recordSet.conditions || []).every((condition: any) => condition.status === 'True')
    );

    if (allRecordSetConditionsTrue) {
      // All recordSet conditions are True, so it's successful
      const updatedStatus: IExtendedControlPlaneStatus = {
        ...statusData,
        status: ControlPlaneStatus.Success,
        isProgrammed: true,
        message: '',
      };

      return {
        extendedStatus: updatedStatus,
        hasRecordSetError: false,
        hasOtherRecordSetErrors: false,
        shouldStopPolling: true,
      };
    }
  }

  // Fall back to top-level conditions (shouldn't happen in normal flow)
  const shouldStopPolling =
    statusData.isProgrammed === true || statusData.programmedReason === 'InvalidDNSRecordSet';

  return {
    extendedStatus: statusData,
    hasRecordSetError: false,
    hasOtherRecordSetErrors: false,
    shouldStopPolling,
  };
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
  const [hasRecordSetError, setHasRecordSetError] = useState(false);
  const [hasOtherRecordSetErrors, setHasOtherRecordSetErrors] = useState(false);

  // Initialize extended status from record fields (already extended)
  useEffect(() => {
    // If record has extended fields, use them directly
    if (record.status) {
      setExtendedStatus(record.status);
      // Reset recordSet error flags when record status changes
      setHasRecordSetError(false);
      setHasOtherRecordSetErrors(false);
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
      const rawStatus = fetcher.data.data;
      const processed = processDnsRecordStatus(rawStatus, record);

      setExtendedStatus(processed.extendedStatus);
      setHasRecordSetError(processed.hasRecordSetError);
      setHasOtherRecordSetErrors(processed.hasOtherRecordSetErrors);

      // Stop polling if needed
      if (processed.shouldStopPolling && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [fetcher.data, fetcher.state, intervalRef, record]);

  // If there are errors on other records in the recordSet, don't show any badge
  if (hasOtherRecordSetErrors) {
    return null;
  }

  if (extendedStatus?.isProgrammed) {
    return null;
  }

  // 2. Error state - show BadgeProgrammingError only if error is from a recordSet condition
  if (
    hasRecordSetError &&
    (extendedStatus?.programmedReason === 'InvalidDNSRecordSet' ||
      extendedStatus?.programmedReason === 'PDNSError')
  ) {
    return (
      <BadgeProgrammingError
        className={className}
        isProgrammed={extendedStatus?.isProgrammed}
        programmedReason={extendedStatus?.programmedReason}
        statusMessage={extendedStatus?.message}
        errorReasons={['InvalidDNSRecordSet', 'PDNSError']}
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
