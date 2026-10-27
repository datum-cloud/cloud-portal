import type { SetupStep, SetupStepKey } from './setup-progress.helpers';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';

/** The assistant's `portal.dock/project` widget id (assistant plugin manifest). */
export const ASSISTANT_DOCK_WIDGET_ID = 'assistant-chat';

/** `name` in the Networks plugin's `plugin-manifest.json`. */
export const NETWORKS_PLUGIN_MANIFEST_NAME = 'network.networking.datumapis.com';

/** The registered Networks plugin, matched by manifest name or its nav id, whatever slug it is mounted under. */
export function findNetworksPlugin(plugins: PublicPlugin[] | undefined): PublicPlugin | undefined {
  return plugins?.find(
    (plugin) =>
      plugin.manifest.name === NETWORKS_PLUGIN_MANIFEST_NAME ||
      getNavExtensions(plugin.manifest).some((nav) => nav.properties.id === 'networks')
  );
}

/**
 * Whether the home page offers exposing a laptop or server through
 * `datumctl connect`. Off until the connect plugin works end to end; the
 * commands below stay ready for when it does.
 */
export const CONNECT_AVAILABLE = false;

// ---------------------------------------------------------------------------
// Patch prompts. Written as the user would say it, since that is how they
// appear in the conversation.
// ---------------------------------------------------------------------------

export type GuidedStart = {
  key: 'app' | 'machine' | 'site' | 'domain';
  label: string;
  /** `network` is undefined when the project has none yet. */
  /** `network` is named only when the project has exactly one; `networkCount` says how many it has. */
  prompt: (network: string | undefined, networkCount?: number) => string;
};

/** Every "What do you want to connect first?" choice, offered or not. */
const ALL_GUIDED_STARTS: readonly GuidedStart[] = [
  {
    key: 'app',
    label: 'An app or container I want to run',
    prompt: (network, networkCount = network ? 1 : 0) =>
      network
        ? `I want to run an app or container on Datum, on my network ${network}. Walk me through it step by step.`
        : networkCount > 1
          ? `I want to run an app or container on Datum. My project has ${networkCount} networks. Walk me through it step by step.`
          : "I want to run an app or container on Datum. I don't have a network yet. Walk me through it step by step.",
  },
  {
    key: 'machine',
    label: 'Something on my laptop or my own servers',
    prompt: () =>
      'I want to make a service on my laptop or my own servers reachable through Datum. Walk me through it step by step.',
  },
  {
    key: 'site',
    label: 'An existing public site or API',
    prompt: () =>
      'I want to put a Datum load balancer in front of an existing public site or API. Walk me through it step by step.',
  },
  {
    key: 'domain',
    label: 'A domain I own',
    prompt: () => 'I want to use a domain I own with Datum. Walk me through it step by step.',
  },
];

/** The "What do you want to connect first?" choices on the path picker. */
export const GUIDED_STARTS: readonly GuidedStart[] = ALL_GUIDED_STARTS.filter(
  (start) => CONNECT_AVAILABLE || start.key !== 'machine'
);

/** Free text from the picker, with the network named so Patch has it. */
export function freeTextPrompt(
  text: string,
  network: string | undefined,
  networkCount: number = network ? 1 : 0
): string {
  const note = network
    ? `My project's network is ${network}.`
    : networkCount > 1
      ? `My project has ${networkCount} networks.`
      : "My project doesn't have a network yet.";
  return `${text.trim()}\n\n(${note})`;
}

/** What "Continue with Patch" asks for at each step of the strip. */
export function continuePrompt(
  step: SetupStepKey,
  names: { network?: string; workload?: string; loadBalancer?: string }
): string {
  switch (step) {
    case 'network':
      return 'Help me create a network for this project.';
    case 'workload':
      return names.network
        ? `Help me deploy my first workload on my network ${names.network}.`
        : 'Help me deploy my first workload.';
    case 'service':
    case 'loadBalancer':
      return names.workload
        ? `Help me make my workload ${names.workload} reachable from the internet with a load balancer.`
        : 'Help me put a load balancer in front of my service.';
    case 'domain':
      return names.loadBalancer
        ? `Help me put my own domain on my load balancer ${names.loadBalancer}.`
        : 'Help me use my own domain with Datum.';
  }
}

// ---------------------------------------------------------------------------
// datumctl commands the "build it myself" path shows
// ---------------------------------------------------------------------------

/** Where the sample deploy runs. `datumctl compute deploy` refuses to run without a location. */
export const SAMPLE_DEPLOY_LOCATION = 'us-central-1';

/** Datum's demo app, so the first deploy works as pasted. */
export const DEMO_APP_IMAGE = 'ghcr.io/datum-labs/compute-network-demo:main';

/**
 * First deploy: one command creates the workload on the network and a public
 * HTTPS URL. It runs the demo app (a plain Linux image, hence the
 * general-purpose runtime) so it works as pasted; people swap in their own image.
 */
export function deployCommand(network: string): string {
  return [
    'datumctl compute deploy datum-demo-app \\',
    `    --image ${DEMO_APP_IMAGE} \\`,
    '    --runtime-class general-purpose \\',
    `    --location ${SAMPLE_DEPLOY_LOCATION} \\`,
    '    --env DEMO_MODE=simulate \\',
    '    --http-port 8080 \\',
    `    --network ${network}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Tunnels: expose a service on a laptop or server through a connector
// ---------------------------------------------------------------------------

/** The datumctl plugin that runs tunnels. */
export const CONNECT_PLUGIN_INSTALL = 'datumctl plugin install datum-cloud/connect';

/** An obvious value to change: the local address the tunnel forwards to. */
export const SAMPLE_TUNNEL_ORIGIN = 'localhost:3000';

/**
 * One command that creates the connector, its load balancer and WAF, and
 * prints a public HTTPS URL; Ctrl+C removes them again. DATUM_PROJECT pins it
 * to this project whatever the datumctl context is (datumctl resolves flags,
 * then this variable, then the context, and hands the result to the plugin).
 */
export function tunnelCommand(projectId: string): string {
  return `DATUM_PROJECT=${projectId} datumctl connect tunnel listen --origin ${SAMPLE_TUNNEL_ORIGIN}`;
}

/**
 * Keeping a tunnel up on a server: a systemd user service that needs a
 * service-account session, since a person's login expires.
 */
export function tunnelServiceCommands(projectId: string): string[] {
  return [
    'datumctl login --credentials key.json --session my-server',
    `datumctl connect tunnel install --name web --origin ${SAMPLE_TUNNEL_ORIGIN} --project ${projectId} --session my-server`,
    'datumctl connect tunnel start --name web',
  ];
}

// ---------------------------------------------------------------------------
// Next-step suggestions for a project that already has something in it
// ---------------------------------------------------------------------------

export type BuildTool = 'deploy' | 'loadBalancer' | 'connect' | 'domain';

export type Suggestion = {
  /** A toolbox action, or creating the project's network when it has none. */
  tool: BuildTool | 'network';
  title: string;
  description: string;
  /** What the same step asks Patch. */
  patchLabel: string;
  patchPrompt: string;
};

const MAX_SUGGESTIONS = 3;

/**
 * Up to three things worth doing next, read from what the project has: a
 * network first if there is none, then the gap in the public path (a workload
 * with no load balancer, a load balancer with no domain), then a first
 * workload, then connecting a machine, then another workload.
 */
export function suggestNextSteps(
  steps: readonly SetupStep[],
  /** How many networks the project has; with several, none is singled out by name. */
  networkCount?: number
): Suggestion[] {
  const status = (key: SetupStepKey) => steps.find((step) => step.key === key)?.status ?? 'todo';
  const name = (key: SetupStepKey) => steps.find((step) => step.key === key)?.resourceName;
  const networks = networkCount ?? (status('network') === 'todo' ? 0 : 1);
  // Named once it exists, ready or not (deploying onto a network still being
  // set up works), but only when it's the project's only one.
  const network = networks === 1 && status('network') !== 'todo' ? name('network') : undefined;
  const workload = name('workload');
  const loadBalancer = name('loadBalancer');
  const names = { network, workload, loadBalancer };

  const suggestions: Suggestion[] = [];
  if (status('network') === 'todo') {
    suggestions.push({
      tool: 'network',
      title: 'Create a network',
      description: 'Workloads run on a private network, so create one before deploying.',
      patchLabel: 'Help me create a network',
      patchPrompt: continuePrompt('network', names),
    });
  }
  if (status('workload') !== 'todo' && status('loadBalancer') === 'todo') {
    suggestions.push({
      tool: 'loadBalancer',
      title: workload ? `Put ${workload} on the internet` : 'Add a load balancer',
      description: 'A public HTTPS hostname with TLS and a web application firewall.',
      patchLabel: workload ? `Make ${workload} reachable` : 'Add a load balancer',
      patchPrompt: continuePrompt('loadBalancer', names),
    });
  }
  if (status('loadBalancer') !== 'todo' && status('domain') === 'todo') {
    suggestions.push({
      tool: 'domain',
      title: 'Use your own domain',
      description: loadBalancer
        ? `Verify a domain you own and add a hostname from it to ${loadBalancer}.`
        : 'Verify a domain you own to use your own hostnames.',
      patchLabel: 'Put my own domain on it',
      patchPrompt: continuePrompt('domain', names),
    });
  }
  const deploy: Suggestion = {
    tool: 'deploy',
    title: status('workload') === 'todo' ? 'Deploy a workload' : 'Deploy another workload',
    description: network
      ? `Run a container on ${network}.`
      : networks > 1
        ? `Run a container on one of your ${networks} networks.`
        : 'Run a container on a private network.',
    patchLabel: status('workload') === 'todo' ? 'Run an app or container' : 'Run another app',
    patchPrompt: GUIDED_STARTS.find((start) => start.key === 'app')!.prompt(network, networks),
  };
  // A first workload comes before connecting a machine; another one after.
  if (status('workload') === 'todo') suggestions.push(deploy);
  if (CONNECT_AVAILABLE) {
    suggestions.push({
      tool: 'connect',
      title: 'Connect a machine',
      description: 'Expose a service from a laptop or your own servers.',
      patchLabel: 'Connect something on my laptop',
      patchPrompt: ALL_GUIDED_STARTS.find((start) => start.key === 'machine')!.prompt(network),
    });
  }
  if (status('workload') !== 'todo') suggestions.push(deploy);

  // Fill to three with steps that fit any project, so the card never looks
  // thin: an edge in front of a site that already runs, and a domain.
  const offered = new Set(suggestions.map((suggestion) => suggestion.tool));
  if (!offered.has('loadBalancer')) {
    const hasLoadBalancer = status('loadBalancer') !== 'todo';
    suggestions.push({
      tool: 'loadBalancer',
      title: hasLoadBalancer ? 'Add another load balancer' : 'Put a site behind a load balancer',
      description:
        "Datum's edge, with TLS and a firewall, in front of a site or API you already run.",
      patchLabel: 'Put my existing site behind Datum',
      patchPrompt: GUIDED_STARTS.find((start) => start.key === 'site')!.prompt(network),
    });
  }
  if (!offered.has('domain') && status('domain') === 'todo') {
    suggestions.push({
      tool: 'domain',
      title: 'Use your own domain',
      description: 'Verify a domain you own to use your own hostnames.',
      patchLabel: 'Use a domain I own',
      patchPrompt: GUIDED_STARTS.find((start) => start.key === 'domain')!.prompt(network),
    });
  }
  return suggestions.slice(0, MAX_SUGGESTIONS);
}
