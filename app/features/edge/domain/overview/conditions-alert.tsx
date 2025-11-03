import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { TriangleAlertIcon } from 'lucide-react';
import { useMemo } from 'react';

interface Condition {
  lastTransitionTime: Date;
  message: string;
  observedGeneration?: bigint;
  reason: string;
  status: 'True' | 'False' | 'Unknown';
  type: string;
}

const getConditionTitle = (condition: Condition) => {
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

export const ConditionsAlert = ({ status }: { status: IDomainControlResponse['status'] }) => {
  const conditions = useMemo(() => {
    return (status?.conditions || []) as unknown as Condition[];
  }, [status?.conditions]);

  const priorityConditions = useMemo(() => {
    // Show Verified, VerifiedDNS, and VerifiedHTTP conditions
    return conditions.filter((condition) =>
      ['Verified', 'VerifiedDNS', 'VerifiedHTTP'].includes(condition.type)
    );
  }, [conditions]);

  return (
    <Alert variant="destructive">
      <TriangleAlertIcon className="text-destructive size-4 font-semibold" />
      <AlertTitle className="font-semibold">Domain Validation Errors</AlertTitle>
      <AlertDescription>
        <div className="space-y-1">
          <p className="text-destructive text-sm">
            The following issues must be resolved before your domain can be verified:
          </p>
          <ul className="list-disc">
            {priorityConditions.map((condition) => (
              <li key={condition.type} className="text-destructive text-sm">
                <span className="mr-1 font-bold">{getConditionTitle(condition)}:</span>
                <span>
                  {condition.type === 'Verified'
                    ? 'Update your DNS provider with the provided record, or use the HTTP token method.'
                    : condition.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
};
