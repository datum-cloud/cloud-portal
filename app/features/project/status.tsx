import { StatusBadge } from '@/components/status-badge/status-badge';
import { useApp } from '@/providers/app.provider';
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import { ROUTE_PATH as PROJECT_STATUS_ROUTE_PATH } from '@/routes/api/projects/status';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

export const ProjectStatus = ({
  currentStatus,
  projectId,
  label,
  showTooltip = true,
  className,
}: {
  currentStatus?: IControlPlaneStatus;
  projectId?: string;
  label?: string;
  showTooltip?: boolean;
  className?: string;
}) => {
  const { orgId } = useApp();
  const fetcher = useFetcher({ key: `project-status-${projectId}` });
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const [status, setStatus] = useState<IControlPlaneStatus>();

  const loadStatus = () => {
    if (projectId && orgId) {
      fetcher.load(getPathWithParams(PROJECT_STATUS_ROUTE_PATH, { id: projectId }));
    }
  };

  useEffect(() => {
    setStatus(currentStatus);

    // Only set up polling if we have the required IDs
    if (!projectId || !orgId) {
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
  }, [projectId, orgId]);

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

  const tooltipText = useMemo(() => {
    if (fetcher.data?.data === ControlPlaneStatus.Success) {
      return 'Active';
    }
    return undefined;
  }, [fetcher.data]);

  return status ? (
    <StatusBadge
      status={status}
      label={label}
      showTooltip={showTooltip}
      className={className}
      tooltipText={tooltipText}
    />
  ) : (
    <></>
  );
};
