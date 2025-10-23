import { StatusDot, StatusText } from '@/components/status-badge/status-badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAIN_STATUS_ROUTE_PATH } from '@/routes/api/domains/status';
import { cn } from '@/utils/common';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useFetcher } from 'react-router';

type Condition = {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime: Date;
  reason: string;
  message: string;
  observedGeneration?: bigint;
};

const getConditionTitle = (condition: Condition): string => {
  switch (condition.type) {
    case 'Verified':
      return 'Domain Verification';
    case 'VerifiedDNS':
      return 'DNS Verification';
    case 'VerifiedHTTP':
      return 'HTTP Verification';
    default:
      return condition.type;
  }
};

export const DomainStatus = ({
  domainId,
  projectId,
  domainStatus,
}: {
  domainId?: string;
  projectId?: string;
  domainStatus: IDomainControlResponse['status'];
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

  const currentStatus = useMemo(() => {
    return transformControlPlaneStatus(domainStatus);
  }, [domainStatus]);

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
      const statusData = fetcher.data as IControlPlaneStatus;
      setStatus(statusData);
      if (
        (statusData.status === ControlPlaneStatus.Success ||
          statusData.status === ControlPlaneStatus.Error) &&
        intervalRef.current
      ) {
        clearInterval(intervalRef.current);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const conditions = useMemo(() => {
    return (domainStatus?.conditions || []) as unknown as Condition[];
  }, [domainStatus?.conditions]);

  const priorityConditions = useMemo(() => {
    // Show Verified, VerifiedDNS, and VerifiedHTTP conditions that have errors
    return conditions.filter(
      (condition) =>
        ['Verified', 'VerifiedDNS', 'VerifiedHTTP'].includes(condition.type) &&
        condition.status !== 'True'
    );
  }, [conditions]);

  return status ? (
    <HoverCard openDelay={300}>
      <HoverCardTrigger
        className={cn(
          'flex cursor-pointer items-center gap-1',
          currentStatus?.status === ControlPlaneStatus.Success ? 'pointer-events-none' : ''
        )}>
        <StatusDot status={currentStatus?.status} />
        <StatusText
          status={currentStatus?.status}
          pendingText="Verifying..."
          readyText="Verified"
        />
      </HoverCardTrigger>
      <HoverCardContent
        className={cn('w-96', priorityConditions.length > 0 && 'border-amber-200 bg-amber-50')}>
        {priorityConditions.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-amber-800">Pending Validation Checks:</p>
            <ul className="ml-4 list-disc space-y-1">
              {priorityConditions.map((condition) => (
                <li key={condition.type} className="text-sm text-black">
                  <span className="mr-1 font-bold">{getConditionTitle(condition)}:</span>
                  <span>
                    {condition.type === 'Verified'
                      ? 'Update your DNS provider with the provided record, or use the HTTP token method.'
                      : condition.message}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground text-xs">
              These items are checked every few minutes. If you&apos;ve already made changes, they
              should be resolve shortly;
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Domain verification is in progress. This may take a few minutes.
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  ) : (
    <></>
  );
};
