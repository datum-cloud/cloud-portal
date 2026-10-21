import { isHealthy } from './home.helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SetupStepKey = 'network' | 'workload' | 'service' | 'loadBalancer' | 'domain';

/**
 * - `done`: at least one resource of this kind is ready.
 * - `inProgress`: one exists but none is ready yet (provisioning, or a domain
 *   waiting for DNS).
 * - `todo`: none exist.
 */
export type SetupStepStatus = 'done' | 'inProgress' | 'todo';

export type SetupStep = {
  key: SetupStepKey;
  label: string;
  status: SetupStepStatus;
  /** The resource that marks the step, ready ones first. */
  resourceName?: string;
};

/** The two fields the derivation reads, so every resource kind fits. */
export type SetupResource = { name: string; status?: unknown };

export type SetupResources = Record<SetupStepKey, readonly SetupResource[]>;

export type ProjectSetup = {
  steps: SetupStep[];
  /** The first step that isn't done, which the next-step card offers. */
  currentStep?: SetupStepKey;
  hasNetwork: boolean;
  hasReadyNetwork: boolean;
  /** No resource of any kind exists, so this is a fresh project. */
  isEmpty: boolean;
  isComplete: boolean;
  /**
   * Still being set up: a ready network, no load balancer serving yet, and at
   * most one of anything. More than one of a kind means someone already knows
   * their way around, so the home page stops guiding.
   */
  isFirstRun: boolean;
};

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

export const SETUP_STEPS: readonly { key: SetupStepKey; label: string }[] = [
  { key: 'network', label: 'Network' },
  { key: 'workload', label: 'Workload' },
  { key: 'service', label: 'Service' },
  { key: 'loadBalancer', label: 'Load balancer' },
  { key: 'domain', label: 'Domain' },
];

function toStep(key: SetupStepKey, label: string, resources: readonly SetupResource[]): SetupStep {
  const ready = resources.find((resource) => isHealthy(resource.status));
  if (ready) return { key, label, status: 'done', resourceName: ready.name };
  if (resources.length > 0)
    return { key, label, status: 'inProgress', resourceName: resources[0].name };
  return { key, label, status: 'todo' };
}

/**
 * How far a project has got from empty to a public, custom-domain service.
 * Each step reads only its own resource kind, so a step can be done out of
 * order (an ALB in front of a public URL needs no workload).
 */
export function deriveProjectSetup(resources: SetupResources): ProjectSetup {
  const steps = SETUP_STEPS.map(({ key, label }) => toStep(key, label, resources[key]));
  const byKey = new Map(steps.map((step) => [step.key, step]));

  return {
    steps,
    currentStep: steps.find((step) => step.status !== 'done')?.key,
    hasNetwork: resources.network.length > 0,
    hasReadyNetwork: byKey.get('network')?.status === 'done',
    isEmpty: SETUP_STEPS.every(({ key }) => resources[key].length === 0),
    isComplete: steps.every((step) => step.status === 'done'),
    isFirstRun:
      byKey.get('network')?.status === 'done' &&
      byKey.get('loadBalancer')?.status !== 'done' &&
      SETUP_STEPS.every(({ key }) => resources[key].length <= 1),
  };
}

/**
 * Whether the home page should lead with the network hero: the project has
 * nothing in it yet but (possibly) a network that is still coming up, and the
 * user hasn't skipped the step. Projects that already have other resources
 * never see it, so existing users keep the page they know.
 */
export function shouldShowNetworkHero(setup: ProjectSetup, skipped: boolean): boolean {
  if (skipped || setup.hasReadyNetwork) return false;
  return !hasVisibleResources(setup.steps);
}

/**
 * The kinds the home page lists for people: workloads, load balancers and
 * domains. A network service on its own (one a deleted workload left behind,
 * say) isn't something they see, so it doesn't make a project "not new".
 */
const VISIBLE_STEPS: readonly SetupStepKey[] = ['workload', 'loadBalancer', 'domain'];

/** Whether the project has anything the home page shows besides its network. */
export function hasVisibleResources(steps: readonly SetupStep[]): boolean {
  return steps.some((step) => VISIBLE_STEPS.includes(step.key) && step.status !== 'todo');
}
