import {
  GUIDED_STARTS,
  continuePrompt,
  deployCommand,
  findNetworksPlugin,
  tunnelCommand,
  tunnelServiceCommands,
  freeTextPrompt,
  suggestNextSteps,
} from './home-mode';
import type { SetupStep, SetupStepKey, SetupStepStatus } from './setup-progress.helpers';
import type { PublicPlugin } from '@/modules/plugins/types';
import { describe, expect, it } from 'vitest';

function plugin(slug: string, name: string): PublicPlugin {
  return {
    slug,
    displayName: slug,
    deprecated: false,
    devMode: true,
    source: 'static',
    manifest: {
      name,
      version: '1.0.0',
      remoteEntry: 'remoteEntry.js',
      exposedModules: {},
      extensions: [],
    },
  };
}

describe('findNetworksPlugin', () => {
  it('finds the Networks plugin by manifest name, whatever it is mounted as', () => {
    const plugins = [
      plugin('compute', 'workload.compute.datumapis.com'),
      plugin('vpc', 'network.networking.datumapis.com'),
    ];
    expect(findNetworksPlugin(plugins)?.slug).toBe('vpc');
  });

  it('returns undefined when the plugin is not registered', () => {
    expect(findNetworksPlugin([plugin('compute', 'workload.compute.datumapis.com')])).toBe(
      undefined
    );
    expect(findNetworksPlugin(undefined)).toBe(undefined);
  });
});

describe('Patch prompts', () => {
  it('names the network in the app or container start', () => {
    const app = GUIDED_STARTS.find((start) => start.key === 'app');
    expect(app?.prompt('prod')).toContain('on my network prod');
  });

  it('says there is no network yet when there is none', () => {
    const app = GUIDED_STARTS.find((start) => start.key === 'app');
    expect(app?.prompt(undefined)).toContain("I don't have a network yet");
    expect(freeTextPrompt('expose my API', undefined)).toBe(
      "expose my API\n\n(My project doesn't have a network yet.)"
    );
  });

  it('keeps free text as typed and adds the network', () => {
    expect(freeTextPrompt('  expose my API  ', 'prod')).toBe(
      "expose my API\n\n(My project's network is prod.)"
    );
  });

  it.each([
    ['workload', { network: 'prod' }, 'Help me deploy my first workload on my network prod.'],
    ['workload', {}, 'Help me deploy my first workload.'],
    [
      'loadBalancer',
      { workload: 'orders-api' },
      'Help me make my workload orders-api reachable from the internet with a load balancer.',
    ],
    ['domain', { loadBalancer: 'edge' }, 'Help me put my own domain on my load balancer edge.'],
  ] as const)('asks Patch to continue at %s', (step, names, expected) => {
    expect(continuePrompt(step, names)).toBe(expected);
  });
});

describe('datumctl commands', () => {
  it('deploys the demo app onto the project network as pasted', () => {
    expect(deployCommand('kev')).toBe(
      [
        'datumctl compute deploy datum-demo-app \\',
        '    --image ghcr.io/datum-labs/compute-network-demo:main \\',
        '    --runtime-class general-purpose \\',
        '    --location us-central-1 \\',
        '    --env DEMO_MODE=simulate \\',
        '    --http-port 8080 \\',
        '    --network kev',
      ].join('\n')
    );
  });
});

describe('tunnel commands', () => {
  it('pins the tunnel to the project and forwards a local port', () => {
    expect(tunnelCommand('project-48ncf')).toBe(
      'DATUM_PROJECT=project-48ncf datumctl connect tunnel listen --origin localhost:3000'
    );
  });

  it('installs a long-running tunnel under a service-account session', () => {
    const [login, install, start] = tunnelServiceCommands('project-48ncf');
    expect(login).toContain('--credentials key.json --session my-server');
    expect(install).toContain('--project project-48ncf --session my-server');
    expect(start).toBe('datumctl connect tunnel start --name web');
  });
});

it('hides the connect options while datumctl connect is unavailable', () => {
  expect(GUIDED_STARTS.map((start) => start.key)).not.toContain('machine');
});

describe('suggestNextSteps', () => {
  const steps = (
    overrides: Partial<Record<SetupStepKey, { status: SetupStepStatus; resourceName?: string }>>
  ): SetupStep[] =>
    (['network', 'workload', 'service', 'loadBalancer', 'domain'] as const).map((key) => ({
      key,
      label: key,
      status: 'todo',
      ...overrides[key],
    }));

  it('suggests a load balancer for a workload that has none', () => {
    const result = suggestNextSteps(
      steps({
        network: { status: 'done', resourceName: 'prod' },
        workload: { status: 'done', resourceName: 'orders-api' },
      })
    );
    expect(result.map((s) => s.tool)).toEqual(['loadBalancer', 'deploy', 'domain']);
    expect(result[0].title).toBe('Put orders-api on the internet');
    expect(result[1].title).toBe('Deploy another workload');
  });

  it('suggests a domain once a load balancer exists', () => {
    const result = suggestNextSteps(
      steps({ loadBalancer: { status: 'done', resourceName: 'edge' } })
    );
    expect(result.map((s) => s.tool)).toEqual(['network', 'domain', 'deploy']);
    expect(result[1].patchPrompt).toBe('Help me put my own domain on my load balancer edge.');
  });

  it('falls back to deploying when the public path is complete', () => {
    const result = suggestNextSteps(
      steps({
        network: { status: 'done', resourceName: 'prod' },
        workload: { status: 'done' },
        loadBalancer: { status: 'done' },
        domain: { status: 'done' },
      })
    );
    expect(result.map((s) => s.tool)).toEqual(['deploy', 'loadBalancer']);
    expect(result[0].description).toBe('Run a container on prod.');
    expect(result[1].title).toBe('Add another load balancer');
  });

  it('leads with creating a network when the project has none', () => {
    const result = suggestNextSteps(
      steps({ loadBalancer: { status: 'done', resourceName: 'edge' } })
    );
    expect(result.map((s) => s.tool)).toEqual(['network', 'domain', 'deploy']);
    expect(result[0].patchPrompt).toBe('Help me create a network for this project.');
  });

  it('skips the network suggestion while one is being created', () => {
    const result = suggestNextSteps(
      steps({
        network: { status: 'inProgress', resourceName: 'prod' },
        loadBalancer: { status: 'done' },
      })
    );
    expect(result.map((s) => s.tool)).not.toContain('network');
  });

  it('moves on to deploying as soon as a network has been created', () => {
    const result = suggestNextSteps(
      steps({ network: { status: 'inProgress', resourceName: 'prod' } })
    );
    expect(result.map((s) => s.tool)).toEqual(['deploy', 'loadBalancer', 'domain']);
    expect(result[1].title).toBe('Put a site behind a load balancer');
    expect(result[0].title).toBe('Deploy a workload');
    expect(result[0].description).toBe('Run a container on prod.');
  });

  it('names no network when the project has several', () => {
    const result = suggestNextSteps(
      steps({
        network: { status: 'done', resourceName: 'connect-auto-20261006-2005' },
        workload: { status: 'done' },
        loadBalancer: { status: 'done' },
        domain: { status: 'done' },
      }),
      3
    );
    const deploy = result.find((s) => s.tool === 'deploy');
    expect(deploy?.description).toBe('Run a container on one of your 3 networks.');
    expect(deploy?.patchPrompt).toContain('My project has 3 networks.');
    expect(freeTextPrompt('expose my API', undefined, 3)).toBe(
      'expose my API\n\n(My project has 3 networks.)'
    );
  });

  it('never suggests more than three steps', () => {
    const result = suggestNextSteps(
      steps({ workload: { status: 'done' }, loadBalancer: { status: 'inProgress' } })
    );
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
