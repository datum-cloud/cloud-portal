import { BadgeStatus } from '@/components/badge/badge-status';
import { ControlPlaneStatus, IControlPlaneStatus } from '@/resources/base';
import { useExportPolicy, useExportPolicyWatch } from '@/resources/export-policies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useMemo } from 'react';

export const ExportPolicyStatus = ({
  currentStatus,
  projectId,
  id,
  label,
  showTooltip = true,
  className,
}: {
  currentStatus?: IControlPlaneStatus;
  projectId?: string;
  id?: string;
  label?: string;
  showTooltip?: boolean;
  className?: string;
}) => {
  // Determine if we need to poll/watch for updates
  const shouldWatch =
    !!projectId &&
    !!id &&
    currentStatus?.status !== ControlPlaneStatus.Success &&
    currentStatus?.status !== ControlPlaneStatus.Error;

  // Use query for data, with refetch when status is pending
  const { data: exportPolicy } = useExportPolicy(projectId ?? '', id ?? '', {
    enabled: shouldWatch,
    refetchInterval: shouldWatch ? 10000 : false,
  });

  // Subscribe to real-time updates when status is pending
  useExportPolicyWatch(projectId ?? '', id ?? '', {
    enabled: shouldWatch,
  });

  // Derive status from fetched data or fall back to current status
  const status = useMemo(() => {
    if (exportPolicy?.status) {
      return transformControlPlaneStatus(exportPolicy.status);
    }
    return (
      currentStatus ?? {
        status: ControlPlaneStatus.Pending,
        message: '',
      }
    );
  }, [exportPolicy?.status, currentStatus]);

  const sinkMessages = useMemo(() => {
    if (status?.sinks) {
      return status.sinks
        .filter(
          (sink: { conditions?: Array<{ status: string }> }) =>
            sink.conditions?.[0]?.status === 'False'
        )
        .map((sink: { conditions?: Array<{ message: string }> }) => sink.conditions?.[0]?.message);
    }
    return [];
  }, [status]);

  const displayLabel =
    label ?? (status.status === ControlPlaneStatus.Success ? 'Ready' : undefined);

  return status ? (
    <BadgeStatus
      status={status}
      label={displayLabel}
      showTooltip={showTooltip}
      className={className}
      tooltipText={
        status.status === ControlPlaneStatus.Success ? (
          'Active'
        ) : (
          <>
            {status.message && status.message !== '' ? (
              <p>{status.message}</p>
            ) : (
              <p>Status not available</p>
            )}
            {sinkMessages.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-left">
                {sinkMessages.map((message: string, index: number) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            )}
          </>
        )
      }
    />
  ) : (
    <></>
  );
};
