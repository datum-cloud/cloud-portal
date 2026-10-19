import type { SetupStepKey } from './setup-progress.helpers';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';

/** The assistant's `portal.dock/project` widget id (assistant plugin manifest). */
export const ASSISTANT_DOCK_WIDGET_ID = 'assistant-chat';

/** `name` in the Networks plugin's `plugin-manifest.json`. */
export const NETWORKS_PLUGIN_MANIFEST_NAME = 'network.networking.datumapis.com';

/** The Networks plugin's mount slug, discovered like the compute plugin's (see `findComputePluginSlug`). */
export function findNetworksPluginSlug(plugins: PublicPlugin[] | undefined): string | undefined {
  return plugins?.find(
    (plugin) =>
      plugin.manifest.name === NETWORKS_PLUGIN_MANIFEST_NAME ||
      getNavExtensions(plugin.manifest).some((nav) => nav.properties.id === 'networks')
  )?.slug;
}

// ---------------------------------------------------------------------------
// Patch prompts. Written as the user would say it, since that is how they
// appear in the conversation.
// ---------------------------------------------------------------------------

export type GuidedStart = {
  key: 'app' | 'machine' | 'site' | 'domain';
  label: string;
  prompt: (network: string) => string;
};

/** The "What do you want to connect first?" choices on the path picker. */
export const GUIDED_STARTS: readonly GuidedStart[] = [
  {
    key: 'app',
    label: 'An app or container I want to run',
    prompt: (network) =>
      `I want to run an app or container on Datum, on my network ${network}. Walk me through it step by step.`,
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

/** Free text from the picker, with the network named so Patch has it. */
export function freeTextPrompt(text: string, network: string): string {
  return `${text.trim()}\n\n(My project's network is ${network}.)`;
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

type LooseWorkload = {
  metadata?: { name?: string };
  spec?: {
    placements?: {
      locations?: { name?: string }[];
      locationSelector?: { matchLabels?: Record<string, string> };
    }[];
    template?: {
      spec?: {
        runtime?: {
          sandbox?: { containers?: { image?: string; ports?: { port?: number }[] }[] };
        };
      };
    };
  };
};

const CITY_CODE_LABEL = 'topology.datum.net/city-code';

/** The `--location` or `--city` flag that keeps a workload where it already runs. */
function placementFlag(workload: LooseWorkload): string {
  const placements = workload.spec?.placements ?? [];
  const locations = placements.flatMap((p) => p.locations ?? []).flatMap((l) => l.name ?? []);
  if (locations.length > 0) return `--location ${[...new Set(locations)].join(',')}`;
  const cities = placements.flatMap(
    (p) => p.locationSelector?.matchLabels?.[CITY_CODE_LABEL] ?? []
  );
  if (cities.length > 0) return `--city ${[...new Set(cities)].join(',')}`;
  return `--location ${SAMPLE_DEPLOY_LOCATION}`;
}

/**
 * Publishing a private workload adds its network service and a public URL.
 * `datumctl compute deploy` needs the image and a location on every run, so
 * they are repeated from the workload as it is; anything unread falls back to
 * a placeholder the person can see and fix.
 */
export function exposeCommand(workload: unknown, fallbackName: string): string {
  const w = (workload ?? {}) as LooseWorkload;
  const name = w.metadata?.name ?? fallbackName;
  const image =
    w.spec?.template?.spec?.runtime?.sandbox?.containers?.find((c) => c.image)?.image ??
    '<your-image>';
  return [
    `datumctl compute deploy ${name} \\`,
    `    --image ${image} \\`,
    `    ${placementFlag(w)} \\`,
    `    --http-port ${firstContainerPort(workload) ?? 8080}`,
  ].join('\n');
}

/** The first container port a workload declares, read loosely since runtimes differ. */
export function firstContainerPort(workload: unknown): number | undefined {
  const containers = (
    workload as {
      spec?: {
        template?: {
          spec?: { runtime?: { sandbox?: { containers?: { ports?: { port?: number }[] }[] } } };
        };
      };
    }
  )?.spec?.template?.spec?.runtime?.sandbox?.containers;
  for (const container of containers ?? []) {
    const port = container.ports?.find((p) => typeof p.port === 'number')?.port;
    if (port) return port;
  }
  return undefined;
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
