import { StatusBadge } from '@/components/status-badge/status-badge';
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import { ROUTE_PATH as GATEWAY_STATUS_ROUTE_PATH } from '@/routes/api+/connect+/gateways+/status';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

export const GatewayStatus = ({
  currentStatus,
  projectId,
  id,
  type = 'dot',
  showTooltip = true,
  badgeClassName,
}: {
  currentStatus?: IControlPlaneStatus;
  projectId?: string;
  id?: string;
  type?: 'dot' | 'badge';
  showTooltip?: boolean;
  badgeClassName?: string;
}) => {
  const fetcher = useFetcher({ key: `gateway-status-${projectId}` });
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const [status, setStatus] = useState<IControlPlaneStatus>();

  const loadStatus = () => {
    if (projectId && id) {
      fetcher.load(`${GATEWAY_STATUS_ROUTE_PATH}?projectId=${projectId}&id=${id}`);
    }
  };

  useEffect(() => {
    setStatus(currentStatus);

    // Only set up polling if we have the required IDs
    if (!projectId || !id) {
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
  }, [projectId, id]);

  useEffect(() => {
    if (fetcher.data) {
      const { status } = fetcher.data as IControlPlaneStatus;

      setStatus(fetcher.data);
      if (
        (status === ControlPlaneStatus.Success || status === ControlPlaneStatus.Error) &&
        intervalRef.current
      ) {
        clearInterval(intervalRef.current);
      }
    }
  }, [fetcher.data]);

  return status ? (
    <StatusBadge
      status={status}
      type={type}
      showTooltip={showTooltip}
      badgeClassName={badgeClassName}
      tooltipText={fetcher.data?.status === ControlPlaneStatus.Success ? 'Active' : undefined}
    />
  ) : (
    <></>
  );
};
