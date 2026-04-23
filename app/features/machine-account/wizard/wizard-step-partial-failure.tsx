import { Button } from '@datum-cloud/datum-ui/button';
import { TriangleAlertIcon } from 'lucide-react';

export interface WizardStepPartialFailureProps {
  accountName: string;
  error: string;
  onRetry: () => void;
  onGoToKeys: () => void;
}

export function WizardStepPartialFailure({
  accountName,
  error,
  onRetry,
  onGoToKeys,
}: WizardStepPartialFailureProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <TriangleAlertIcon className="text-warning size-5 shrink-0" aria-hidden="true" />
        <h3 className="text-foreground text-sm font-semibold">
          Machine account created, but key creation failed
        </h3>
      </div>

      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">&ldquo;{accountName}&rdquo;</span> was created
        successfully. The key could not be created: {error}
      </p>

      <div className="flex gap-2 pt-2">
        <Button htmlType="button" type="primary" theme="solid" onClick={onRetry}>
          Retry Key Creation
        </Button>
        <Button htmlType="button" type="secondary" theme="solid" onClick={onGoToKeys}>
          Go to Keys Tab
        </Button>
      </div>
    </div>
  );
}
