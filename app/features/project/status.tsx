import { BadgeStatus } from '@/components/badge/badge-status';
import { deriveSuspensionVerdict, reasonSummary } from '@/features/project/suspension';
import { useApp } from '@/providers/app.provider';
import { ControlPlaneStatus, IControlPlaneStatus } from '@/resources/base';
import type { Project } from '@/resources/projects';
import { isProjectDeleting, useProject } from '@/resources/projects';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useMemo } from 'react';

export const ProjectStatus = ({
  project,
  currentStatus,
  projectId,
  label,
  showTooltip = true,
  hideActive = false,
  className,
}: {
  /** Full project object — preferred; enables suspension detection without a fetch. */
  project?: Project;
  currentStatus?: IControlPlaneStatus;
  projectId?: string;
  label?: string;
  showTooltip?: boolean;
  /** Render nothing for healthy projects (list contexts — no "Active" noise). */
  hideActive?: boolean;
  className?: string;
}) => {
  const { orgId } = useApp();

  // Determine if we need to poll/watch for updates
  const shouldWatch =
    !project &&
    !!projectId &&
    !!orgId &&
    (!currentStatus || currentStatus?.status === ControlPlaneStatus.Pending);

  // Use query for data, with refetch when status is pending
  const { data: fetchedProject } = useProject(projectId ?? '', {
    enabled: shouldWatch,
    refetchInterval: shouldWatch ? 10000 : false,
  });

  const resolvedProject = project ?? fetchedProject;
  const rawStatus = resolvedProject?.status;
  const deleting = resolvedProject != null && isProjectDeleting(resolvedProject);

  // Suspension wins over Ready-derived state (suspension never flips Ready,
  // so without this a suspended project reads as "Active").
  const verdict = useMemo(() => deriveSuspensionVerdict(rawStatus), [rawStatus]);

  // Derive status from raw data or fall back to current status
  const status = useMemo(() => {
    if (rawStatus) {
      return transformControlPlaneStatus(rawStatus);
    }
    return currentStatus;
  }, [rawStatus, currentStatus]);

  const tooltipText = useMemo(() => {
    if (status?.status === ControlPlaneStatus.Success) {
      return 'Active';
    }
    return undefined;
  }, [status]);

  if (deleting) {
    return (
      <BadgeStatus
        status="pending"
        label={label ?? 'Deleting'}
        showIcon
        showTooltip={showTooltip}
        tooltipText="This project is being deleted"
        className={className}
      />
    );
  }

  if (verdict.isSuspended) {
    return (
      <BadgeStatus
        status="suspended"
        label={label}
        showTooltip={showTooltip}
        tooltipText={reasonSummary(verdict.reasons)}
        className={className}
      />
    );
  }

  if (hideActive && status?.status === ControlPlaneStatus.Success) {
    return null;
  }

  return status ? (
    <BadgeStatus
      status={status}
      label={label}
      showTooltip={showTooltip}
      className={className}
      tooltipText={tooltipText}
    />
  ) : null;
};
