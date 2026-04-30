import { CheckIcon, CircleIcon, Loader2Icon } from 'lucide-react';

export type OrchestratingPhase = 'creating-account' | 'polling' | 'creating-key';

export interface WizardStepProgressProps {
  phase: OrchestratingPhase;
}

interface StepRowProps {
  label: string;
  status: 'pending' | 'active' | 'done';
}

function StepRow({ label, status }: StepRowProps) {
  return (
    <div className="flex items-center gap-3">
      {status === 'done' && (
        <CheckIcon className="text-success size-5 shrink-0" aria-hidden="true" />
      )}
      {status === 'active' && (
        <Loader2Icon className="text-foreground size-5 shrink-0 animate-spin" aria-hidden="true" />
      )}
      {status === 'pending' && (
        <CircleIcon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
      )}
      <span
        className={
          status === 'pending' ? 'text-muted-foreground text-sm' : 'text-foreground text-sm'
        }>
        {label}
      </span>
    </div>
  );
}

export function WizardStepProgress({ phase }: WizardStepProgressProps) {
  const accountStatus = phase === 'creating-account' ? 'active' : 'done';

  const identityStatus =
    phase === 'creating-account' ? 'pending' : phase === 'polling' ? 'active' : 'done';

  const keyStatus = phase === 'creating-key' ? 'active' : 'pending';

  return (
    <div
      className="flex flex-col gap-4 pb-4"
      role="status"
      aria-label="Wizard orchestration progress">
      <StepRow label="Creating machine account..." status={accountStatus} />
      <StepRow label="Waiting for identity email assignment..." status={identityStatus} />
      <StepRow label="Creating key..." status={keyStatus} />
    </div>
  );
}
