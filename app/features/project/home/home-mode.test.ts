import {
  GUIDED_STARTS,
  continuePrompt,
  deployCommand,
  exposeCommand,
  findNetworksPluginSlug,
  tunnelCommand,
  tunnelServiceCommands,
  firstContainerPort,
  freeTextPrompt,
} from './home-mode';
import type { PublicPlugin } from '@/modules/plugins/types';
import { describe, expect, it } from 'bun:test';

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

describe('findNetworksPluginSlug', () => {
  it('finds the Networks plugin by manifest name, whatever it is mounted as', () => {
    const plugins = [
      plugin('compute', 'workload.compute.datumapis.com'),
      plugin('vpc', 'network.networking.datumapis.com'),
    ];
    expect(findNetworksPluginSlug(plugins)).toBe('vpc');
  });

  it('returns undefined when the plugin is not registered', () => {
    expect(findNetworksPluginSlug([plugin('compute', 'workload.compute.datumapis.com')])).toBe(
      undefined
    );
    expect(findNetworksPluginSlug(undefined)).toBe(undefined);
  });
});

describe('Patch prompts', () => {
  it('names the network in the app or container start', () => {
    const app = GUIDED_STARTS.find((start) => start.key === 'app');
    expect(app?.prompt('prod')).toContain('on my network prod');
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

  it('repeats the workload image and locations when publishing it', () => {
    const workload = {
      metadata: { name: 'orders-api' },
      spec: {
        placements: [{ locations: [{ name: 'us-central-1' }, { name: 'us-east-1' }] }],
        template: {
          spec: {
            runtime: {
              sandbox: {
                containers: [{ image: 'ghcr.io/acme/orders:1.4', ports: [{ port: 3000 }] }],
              },
            },
          },
        },
      },
    };
    expect(exposeCommand(workload, 'unused')).toBe(
      [
        'datumctl compute deploy orders-api \\',
        '    --image ghcr.io/acme/orders:1.4 \\',
        '    --location us-central-1,us-east-1 \\',
        '    --http-port 3000',
      ].join('\n')
    );
  });

  it('keeps a city placement as --city', () => {
    const workload = {
      spec: {
        placements: [
          { locationSelector: { matchLabels: { 'topology.datum.net/city-code': 'DFW' } } },
        ],
      },
    };
    expect(exposeCommand(workload, 'demo')).toContain('--city DFW');
  });

  it('falls back to placeholders it cannot read', () => {
    const command = exposeCommand(undefined, 'orders-api');
    expect(command).toContain('datumctl compute deploy orders-api');
    expect(command).toContain('--image <your-image>');
    expect(command).toContain('--location us-central-1');
    expect(command).toContain('--http-port 8080');
  });

  it('reads the first declared container port', () => {
    const workload = {
      spec: {
        template: {
          spec: {
            runtime: {
              sandbox: {
                containers: [
                  { name: 'sidecar' },
                  { name: 'app', ports: [{ name: 'http', port: 3000 }] },
                ],
              },
            },
          },
        },
      },
    };
    expect(firstContainerPort(workload)).toBe(3000);
    expect(firstContainerPort({ spec: {} })).toBe(undefined);
    expect(firstContainerPort(undefined)).toBe(undefined);
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
