import { continuePrompt, deployCommand, exposeCommand, findNetworksPluginSlug } from './home-mode';
import { GUIDED_STEPS, type SetupStep, type SetupStepKey } from './setup-progress.helpers';
import { useComputePluginSlug } from '@/features/edge/proxy/overview/compute-backend';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import { pluginHref } from '@/modules/project-nav/merge-plugin-nav';
import { useComputeWorkloads } from '@/resources/compute-workloads';
import { useNetworkServices } from '@/resources/network-services';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Brain, Check, Copy, Lock, Plus, Server, Split } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

type StepNames = { network?: string; workload?: string; service?: string; loadBalancer?: string };

/**
 * The one thing to do next while a project is being set up: the tool for the
 * current step (a datumctl command, or the portal dialog), with Patch offered
 * alongside when it is installed.
 */
export function NextStep({
  projectId,
  steps,
  currentStep,
  onAskPatch,
}: {
  projectId: string;
  steps: SetupStep[];
  currentStep: SetupStepKey;
  /** Undefined when Patch isn't installed for this project. */
  onAskPatch?: (prompt: string) => void;
}) {
  const names: StepNames = Object.fromEntries(
    steps.map((step) => [step.key, step.resourceName])
  ) as StepNames;
  const label = steps.find((step) => step.key === currentStep)?.label ?? '';
  const stepNumber = GUIDED_STEPS.indexOf(currentStep) + 1;

  return (
    <section
      className="bg-card flex flex-col gap-4 rounded-xl border p-6"
      aria-labelledby="next-step-heading"
      data-testid={`next-step-${currentStep}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-3">
          <Text
            as="h2"
            id="next-step-heading"
            size="xs"
            weight="medium"
            className="text-btn-primary tracking-wider uppercase">
            Step {stepNumber} of {GUIDED_STEPS.length} · {label}
          </Text>
          <StepDots steps={steps} currentStep={currentStep} />
        </span>
        {onAskPatch && (
          <Button
            type="quaternary"
            theme="borderless"
            size="xs"
            className="text-btn-primary"
            onClick={() => onAskPatch(continuePrompt(currentStep, names))}>
            <Icon icon={Brain} size={13} />
            Ask Patch to do it
          </Button>
        )}
      </header>
      <BuildStep projectId={projectId} step={currentStep} names={names} />
    </section>
  );
}

function BuildStep({
  projectId,
  step,
  names,
}: {
  projectId: string;
  step: SetupStepKey;
  names: StepNames;
}) {
  const computeSlug = useComputePluginSlug(projectId);
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  const networksSlug = findNetworksPluginSlug(plugins);
  const { data: workloads } = useComputeWorkloads(projectId, { staleTime: QUERY_STALE_TIME });
  const { data: services } = useNetworkServices(projectId, { staleTime: QUERY_STALE_TIME });

  if (step === 'network') return null;

  if (step === 'workload') {
    const network = names.network ?? '<your-network>';
    return (
      <StepBody icon={Server} title="Deploy your first workload">
        <span className="flex flex-col gap-3">
          <span>
            This deploys Datum&apos;s demo app on {network} with a public HTTPS URL, so you can see
            it working. Swap <code className="font-mono">--image</code> for your own, or leave out{' '}
            <code className="font-mono">--http-port</code> to keep it private.
          </span>
          <CommandBlock command={deployCommand(network)} />
          {computeSlug && (
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <InlineLink to={pluginHref(projectId, computeSlug, '')}>
                Use a manifest instead
              </InlineLink>
              <InlineLink to={pluginHref(projectId, computeSlug, '')}>Try the demo</InlineLink>
            </span>
          )}
        </span>
      </StepBody>
    );
  }

  if (step === 'service') {
    const workloadName = names.workload ?? 'my-app';
    const workload = workloads?.find((w) => w.metadata?.name === workloadName);
    return (
      <StepBody
        icon={Lock}
        title={`${workloadName} is private. Nothing on the internet can reach it yet.`}>
        <span className="flex flex-col gap-3">
          <span>Publish it to give it a network service and a public HTTPS URL in one go.</span>
          <CommandBlock command={exposeCommand(workload, workloadName)} />
          {networksSlug && names.network && (
            <InlineLink
              to={pluginHref(projectId, networksSlug, `networks/${names.network}/services`)}>
              Or create a network service in the portal
            </InlineLink>
          )}
        </span>
      </StepBody>
    );
  }

  if (step === 'loadBalancer') {
    const service = services?.find((s) => s.metadata?.name === names.service);
    return (
      <LoadBalancerStep
        projectId={projectId}
        serviceName={names.service}
        servicePort={service?.spec?.ports?.[0]?.name}
        canPreselect={!!computeSlug && !!service}
      />
    );
  }

  return null;
}

function LoadBalancerStep({
  projectId,
  serviceName,
  servicePort,
  canPreselect,
}: {
  projectId: string;
  serviceName?: string;
  servicePort?: string;
  canPreselect: boolean;
}) {
  const formRef = useRef<HttpProxyFormDialogRef>(null);
  return (
    <>
      <StepBody
        icon={Split}
        title={serviceName ? `Put ${serviceName} on the internet` : 'Add a load balancer'}
        action={
          <Button type="primary" theme="solid" size="small" onClick={() => formRef.current?.show()}>
            <Icon icon={Plus} size={14} />
            Add load balancer
          </Button>
        }>
        A load balancer gives it a public HTTPS hostname with TLS and a web application firewall,
        and forwards traffic privately over your network.
      </StepBody>
      {/* Keyed so it mounts with the service once it's known; the form reads defaults on mount. */}
      <HttpProxyFormDialog
        key={canPreselect ? serviceName : 'blank'}
        ref={formRef}
        projectId={projectId}
        initialService={
          canPreselect && serviceName ? { name: serviceName, port: servicePort } : undefined
        }
      />
    </>
  );
}

/** One dot per guided step: done ones filled, the current one ringed. */
function StepDots({ steps, currentStep }: { steps: SetupStep[]; currentStep: SetupStepKey }) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      {GUIDED_STEPS.map((key) => {
        const done = steps.find((step) => step.key === key)?.status === 'done';
        return (
          <span
            key={key}
            className={cn(
              'size-2 rounded-full',
              done
                ? 'bg-green-600'
                : key === currentStep
                  ? 'ring-btn-primary bg-btn-primary/20 ring-1'
                  : 'bg-muted-foreground/25'
            )}
          />
        );
      })}
    </span>
  );
}

function StepBody({
  icon,
  title,
  action,
  children,
}: {
  icon: typeof Server;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 @3xl/main:flex-row @3xl/main:items-start">
      <span className="bg-btn-primary/10 text-btn-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon icon={icon} size={18} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Text size="sm" weight="medium">
          {title}
        </Text>
        <Text as="div" size="sm" textColor="muted">
          {children}
        </Text>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CommandBlock({ command }: { command: string }) {
  const [copied, copy] = useCopyToClipboard();
  return (
    <span className="bg-muted text-foreground relative block rounded-lg">
      <pre className="overflow-x-auto px-4 py-3 pr-12 font-mono text-xs leading-relaxed">
        <span className="text-muted-foreground select-none">$ </span>
        {command}
      </pre>
      <Button
        type="quaternary"
        theme="borderless"
        size="xs"
        aria-label="Copy command"
        className="absolute top-2 right-2"
        onClick={() => copy(command.replace(/\\\n\s+/g, ''), { withToast: true })}>
        <Icon icon={copied ? Check : Copy} size={13} />
      </Button>
    </span>
  );
}

function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-btn-primary font-medium hover:underline">
      {children}
    </Link>
  );
}
