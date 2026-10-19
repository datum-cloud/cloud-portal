import {
  deriveProjectSetup,
  shouldShowNetworkHero,
  type SetupResource,
  type SetupResources,
} from './setup-progress.helpers';
import { describe, expect, it } from 'bun:test';

const ready = (name: string): SetupResource => ({
  name,
  status: { conditions: [{ type: 'Ready', status: 'True' }] },
});
const pending = (name: string): SetupResource => ({
  name,
  status: { conditions: [{ type: 'Ready', status: 'False', reason: 'Provisioning' }] },
});

const resources = (overrides: Partial<SetupResources> = {}): SetupResources => ({
  network: [],
  workload: [],
  service: [],
  loadBalancer: [],
  domain: [],
  ...overrides,
});

describe('deriveProjectSetup', () => {
  it('reports an empty project with the network as the current step', () => {
    const setup = deriveProjectSetup(resources());
    expect(setup.isEmpty).toBe(true);
    expect(setup.hasNetwork).toBe(false);
    expect(setup.currentStep).toBe('network');
    expect(setup.steps.map((step) => step.status)).toEqual([
      'todo',
      'todo',
      'todo',
      'todo',
      'todo',
    ]);
  });

  it('marks a network that is still coming up as in progress, not done', () => {
    const setup = deriveProjectSetup(resources({ network: [pending('default')] }));
    expect(setup.hasNetwork).toBe(true);
    expect(setup.hasReadyNetwork).toBe(false);
    expect(setup.steps[0]).toEqual({
      key: 'network',
      label: 'Network',
      status: 'inProgress',
      resourceName: 'default',
    });
    expect(setup.currentStep).toBe('network');
  });

  it('names the ready resource when some are still provisioning', () => {
    const setup = deriveProjectSetup(
      resources({ network: [pending('staging'), ready('default')] })
    );
    expect(setup.steps[0].status).toBe('done');
    expect(setup.steps[0].resourceName).toBe('default');
  });

  it('moves the current step to the first one not done', () => {
    const setup = deriveProjectSetup(
      resources({ network: [ready('default')], workload: [ready('orders-api')] })
    );
    expect(setup.currentStep).toBe('service');
    expect(setup.isComplete).toBe(false);
  });

  it('counts steps done out of order', () => {
    const setup = deriveProjectSetup(resources({ loadBalancer: [ready('edge')] }));
    expect(setup.steps.find((step) => step.key === 'loadBalancer')?.status).toBe('done');
    expect(setup.currentStep).toBe('network');
    expect(setup.isEmpty).toBe(false);
  });

  it('is complete when every step has a ready resource', () => {
    const setup = deriveProjectSetup(
      resources({
        network: [ready('default')],
        workload: [ready('orders-api')],
        service: [ready('orders-api')],
        loadBalancer: [ready('orders-api')],
        domain: [ready('acme-com')],
      })
    );
    expect(setup.isComplete).toBe(true);
    expect(setup.currentStep).toBeUndefined();
  });

  it('treats a resource with no status as in progress', () => {
    const setup = deriveProjectSetup(resources({ domain: [{ name: 'acme-com' }] }));
    expect(setup.steps.find((step) => step.key === 'domain')?.status).toBe('inProgress');
  });
});

describe('isFirstRun', () => {
  it.each([
    ['an empty project', resources(), false],
    ['a network still coming up', resources({ network: [pending('default')] }), false],
    ['a ready network', resources({ network: [ready('default')] }), true],
    [
      'a running workload with no load balancer yet',
      resources({ network: [ready('default')], workload: [ready('orders-api')] }),
      true,
    ],
    [
      'a load balancer still provisioning',
      resources({ network: [ready('default')], loadBalancer: [pending('edge')] }),
      true,
    ],
    [
      'a load balancer serving',
      resources({ network: [ready('default')], loadBalancer: [ready('edge')] }),
      false,
    ],
    [
      'more than one of something',
      resources({ network: [ready('default')], domain: [ready('a'), ready('b')] }),
      false,
    ],
  ])('%s', (_label, input, expected) => {
    expect(deriveProjectSetup(input).isFirstRun).toBe(expected);
  });
});

describe('shouldShowNetworkHero', () => {
  it.each([
    ['an empty project', resources(), false, true],
    ['a network still coming up', resources({ network: [pending('default')] }), false, true],
    ['a ready network', resources({ network: [ready('default')] }), false, false],
    [
      'a project with only a load balancer',
      resources({ loadBalancer: [ready('edge')] }),
      false,
      false,
    ],
    ['a project with only a domain', resources({ domain: [pending('acme-com')] }), false, false],
    ['an empty project the user skipped', resources(), true, false],
  ])('%s', (_label, input, skipped, expected) => {
    expect(shouldShowNetworkHero(deriveProjectSetup(input), skipped)).toBe(expected);
  });
});
