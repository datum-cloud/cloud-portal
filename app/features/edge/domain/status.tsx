import { StatusBadge } from '@/components/status-badge/status-badge';
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import { ROUTE_PATH as DOMAIN_STATUS_ROUTE_PATH } from '@/routes/api/domains/status';
import { getPathWithParams } from '@/utils/path';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

export const DomainStatus = ({
  currentStatus,
  domainId,
  projectId,
}: {
  currentStatus?: IControlPlaneStatus;
  domainId?: string;
  projectId?: string;
}) => {
  const fetcher = useFetcher({ key: `domain-status-${domainId}` });
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const [status, setStatus] = useState<IControlPlaneStatus>();

  const loadStatus = () => {
    if (domainId && projectId) {
      fetcher.load(
        `${getPathWithParams(DOMAIN_STATUS_ROUTE_PATH, { id: domainId })}?projectId=${projectId}`
      );
    }
  };

  useEffect(() => {
    setStatus(currentStatus);

    // Only set up polling if we have the required IDs
    if (!projectId || !domainId) {
      return;
    }

    // Initial load if:
    // 1. No current status exists, or
    // 2. Current status is pending
    if (!currentStatus || currentStatus?.status === ControlPlaneStatus.Pending) {
      loadStatus();

      // Set up polling interval
      intervalRef.current = setInterval(loadStatus, 10000);
    }

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [projectId, domainId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, data } = fetcher.data;

      if (!success) {
        return;
      }

      setStatus(data);
      if (
        (data === ControlPlaneStatus.Success || data === ControlPlaneStatus.Error) &&
        intervalRef.current
      ) {
        clearInterval(intervalRef.current);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return status ? (
    <StatusBadge
      status={status}
      type="badge"
      readyText="Verified"
      pendingText="Verification in progress..."
      tooltipText="Update your DNS provider with the provided record, or use the HTTP token method."
    />
  ) : (
    <></>
  );
};
