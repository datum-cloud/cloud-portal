import type { SetupStep, SetupStepKey } from './setup-progress.helpers';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Check, Globe, LoaderCircle, Network, Server, Split, Waypoints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

const STEP_ICONS: Record<SetupStepKey, LucideIcon> = {
  network: Network,
  workload: Server,
  service: Waypoints,
  loadBalancer: Split,
  domain: Globe,
};

/** List pages the host owns. Plugin-owned steps (network, workload, service) don't link yet. */
function stepHref(key: SetupStepKey, projectId: string): string | undefined {
  if (key === 'loadBalancer')
    return getPathWithParams(paths.project.detail.proxy.root, { projectId });
  if (key === 'domain') return getPathWithParams(paths.project.detail.domains.root, { projectId });
  return undefined;
}

function stepCaption(step: SetupStep, isCurrent: boolean): string {
  if (step.status === 'done') return step.resourceName ?? 'Done';
  if (step.status === 'inProgress') return `${step.resourceName ?? 'Setting up'}, in progress`;
  return isCurrent ? 'Up next' : 'Later';
}

/**
 * The first-run setup strip: network, workload, service, load balancer,
 * domain. It reads the project's real resources, so it fills in the same way
 * whether a step was done here, in the CLI or by Patch.
 */
export function SetupProgress({
  projectId,
  steps,
  currentStep,
  isComplete,
  onHide,
}: {
  projectId: string;
  steps: SetupStep[];
  currentStep?: SetupStepKey;
  isComplete: boolean;
  onHide: () => void;
}) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="setup-progress-heading">
      <header className="flex items-center justify-between gap-2">
        <Text as="h2" id="setup-progress-heading" size="sm" weight="medium">
          {isComplete ? 'Setup complete' : 'Your setup'}
        </Text>
        {isComplete ? (
          <Button type="quaternary" theme="borderless" size="xs" onClick={onHide}>
            Hide
          </Button>
        ) : (
          <Text size="xs" textColor="muted">
            Updates as you build, from the portal, the CLI or Patch
          </Text>
        )}
      </header>
      <ol className="grid grid-cols-2 gap-2 @3xl/main:grid-cols-5">
        {steps.map((step) => (
          <SetupProgressStep
            key={step.key}
            step={step}
            isCurrent={step.key === currentStep}
            href={stepHref(step.key, projectId)}
          />
        ))}
      </ol>
    </section>
  );
}

function SetupProgressStep({
  step,
  isCurrent,
  href,
}: {
  step: SetupStep;
  isCurrent: boolean;
  href?: string;
}) {
  const done = step.status === 'done';
  const inProgress = step.status === 'inProgress';
  const body = (
    <>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          done
            ? 'bg-green-600 text-white'
            : isCurrent
              ? 'bg-btn-primary/10 text-btn-primary'
              : 'bg-muted'
        )}
        aria-hidden>
        <Icon
          icon={done ? Check : inProgress ? LoaderCircle : STEP_ICONS[step.key]}
          size={13}
          className={cn(
            inProgress && 'animate-spin',
            !done && !isCurrent && 'text-icon-quaternary'
          )}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <Text
          as="span"
          size="sm"
          weight="medium"
          className={cn(
            done ? 'text-green-700 dark:text-green-500' : !isCurrent && 'text-muted-foreground'
          )}>
          {step.label}
        </Text>
        <Text
          as="span"
          size="xs"
          className={cn(
            'truncate',
            done
              ? 'text-green-700 dark:text-green-500'
              : isCurrent
                ? 'text-btn-primary'
                : 'text-muted-foreground'
          )}>
          {stepCaption(step, isCurrent)}
        </Text>
      </span>
    </>
  );

  const className = cn(
    'flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5',
    done
      ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
      : isCurrent
        ? 'border-btn-primary bg-card'
        : 'border-border'
  );

  return (
    <li aria-current={isCurrent ? 'step' : undefined} data-testid={`setup-step-${step.key}`}>
      {href ? (
        <Link to={href} className={cn(className, 'hover:bg-muted/50 transition-colors')}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}
