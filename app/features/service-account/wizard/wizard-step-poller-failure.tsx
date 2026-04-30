import { Button } from '@datum-cloud/datum-ui/button';
import { TriangleAlertIcon } from 'lucide-react';

export interface WizardStepPollerFailureProps {
  accountName: string;
  error: string;
  onRetry: () => void;
  onGoToKeys: () => void;
}

export function WizardStepPollerFailure({
  accountName,
  error,
  onRetry,
  onGoToKeys,
}: WizardStepPollerFailureProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <TriangleAlertIcon className="text-warning size-5 shrink-0" aria-hidden="true" />
        <h3 className="text-foreground text-sm font-semibold">
          Account created, but identity setup is taking longer than expected
        </h3>
      </div>

      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">&ldquo;{accountName}&rdquo;</span> was
        created. The identity provider has not assigned an email yet: {error}
      </p>

      <div className="flex gap-2 pt-2">
        <Button htmlType="button" type="primary" theme="solid" onClick={onRetry}>
          Retry Setup
        </Button>
        <Button htmlType="button" type="secondary" theme="solid" onClick={onGoToKeys}>
          Go to Keys Tab
        </Button>
      </div>
    </div>
  );
}
