import { BadgeStatus } from '@/components/badge/badge-status';
import { useApp } from '@/providers/app.provider';
import { ControlPlaneStatus, IControlPlaneStatus } from '@/resources/base';
import { useProject } from '@/resources/projects';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useMemo } from 'react';

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

  // Determine if we need to poll/watch for updates
  const shouldWatch =
    !!projectId &&
    !!orgId &&
    (!currentStatus || currentStatus?.status === ControlPlaneStatus.Pending);

  // Use query for data, with refetch when status is pending
  const { data: project } = useProject(projectId ?? '', {
    enabled: shouldWatch,
    refetchInterval: shouldWatch ? 10000 : false,
  });

  // Derive status from fetched data or fall back to current status
  const status = useMemo(() => {
    if (project?.status) {
      return transformControlPlaneStatus(project.status);
    }
    return currentStatus;
  }, [project?.status, currentStatus]);

  const tooltipText = useMemo(() => {
    if (status?.status === ControlPlaneStatus.Success) {
      return 'Active';
    }
    return undefined;
  }, [status]);

  return status ? (
    <BadgeStatus
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
