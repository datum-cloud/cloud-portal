import { BadgeStatus } from '@/components/badge/badge-status';
import { ControlPlaneStatus } from '@/resources/base';
import { DOMAIN_VERIFICATION_STATUS, type Domain } from '@/resources/domains';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { cn } from '@shadcn/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@shadcn/ui/hover-card';
import { useMemo } from 'react';

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

export const DomainStatus = ({ domainStatus }: { domainStatus: Domain['status'] }) => {
  const currentStatus = useMemo(() => {
    return transformControlPlaneStatus(domainStatus);
  }, [domainStatus]);

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

  const statusLabel = currentStatus
    ? DOMAIN_VERIFICATION_STATUS[currentStatus.status]?.label
    : undefined;

  if (!currentStatus) {
    return null;
  }

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger
        className={cn(
          'w-fit',
          currentStatus?.status === ControlPlaneStatus.Success ? 'pointer-events-none' : ''
        )}>
        <BadgeStatus
          status={currentStatus}
          label={statusLabel}
          showIcon={false}
          showTooltip={false}
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
  );
};
