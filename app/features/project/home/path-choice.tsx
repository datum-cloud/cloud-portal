import { CommandBlock } from './command-block';
import {
  type BuildTool,
  CONNECT_AVAILABLE,
  CONNECT_PLUGIN_INSTALL,
  deployCommand,
  tunnelCommand,
  tunnelServiceCommands,
} from './home-mode';
import type { ComDatumapisNetworkingV1AlphaNetwork } from '@/modules/control-plane/networking';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  CircleCheck,
  Globe,
  LoaderCircle,
  Plug,
  Server,
  Split,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

export type { BuildTool } from './home-mode';

type Tool = {
  key: BuildTool;
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  /** The action opens a CLI command to copy, in place. */
  command?: boolean;
};

const ALL_TOOLS: readonly Tool[] = [
  {
    key: 'connect',
    icon: Plug,
    title: 'Connect a machine',
    description: 'Expose a service from a laptop or your own servers',
    action: 'Show command',
    command: true,
  },
  {
    key: 'deploy',
    icon: Server,
    title: 'Deploy a workload',
    description: 'Run containers or VMs on the network',
    action: 'Show command',
    command: true,
  },
  {
    key: 'loadBalancer',
    icon: Split,
    title: 'Add a load balancer',
    description: 'Public hostname, TLS and WAF in front of a service',
    action: 'Add ALB',
  },
  {
    key: 'domain',
    icon: Globe,
    title: 'Add a domain',
    description: 'Verify a domain to use your own hostnames',
    action: 'Add domain',
  },
];

const TOOLS = ALL_TOOLS.filter((tool) => CONNECT_AVAILABLE || tool.key !== 'connect');

/**
 * Screen 2 of first-run setup: the network is ready, so ask how the person
 * wants to build the rest. Both paths make the same resources; the choice only
 * changes how the home page guides them, and they can switch later.
 *
 * It stays until the project has something besides its network: nothing here
 * switches modes. Toolbox rows act in place (the deploy command opens inline,
 * the dialogs open over the page) and Patch opens in its side panel, so the
 * person can try either and come back. The tools are the same compact tiles
 * the established home page uses for next steps. Patch is the box at the top
 * of the page, where the search would be; without Patch, only the tools show.
 */
export function PathChoice({
  projectId,
  networkName,
  networkReady,
  network,
  networkHref,
  onCreateNetwork,
  onTool,
  hasPatch,
}: {
  projectId: string;
  /** Undefined when the project has no network, e.g. after skipping that step. */
  networkName?: string;
  networkReady: boolean;
  /** The ready network, for its address range and MTU. */
  network?: ComDatumapisNetworkingV1AlphaNetwork;
  /** The network's page in the Networks plugin, when it is installed. */
  networkHref?: string;
  /** Brings back the create-network step; offered when there is no network. */
  onCreateNetwork: () => void;
  /** A toolbox row's action. The deploy command is shown here; the rest are the page's. */
  onTool: (tool: BuildTool) => void;
  /** Patch is installed, and offered in the box at the top of the page. */
  hasPatch: boolean;
}) {
  // The CLI rows open their commands in place; one at a time.
  const [expanded, setExpanded] = useState<BuildTool | null>(null);
  const rowProps = {
    projectId,
    networkName,
    expanded,
    onToggle: (tool: BuildTool) => setExpanded((open) => (open === tool ? null : tool)),
    onTool,
    onCreateNetwork,
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="path-choice-heading">
      <NetworkLine
        networkName={networkName}
        networkReady={networkReady}
        network={network}
        networkHref={networkHref}
        onCreateNetwork={onCreateNetwork}
      />

      {/* The same section heading as the rest of the home page. */}
      <div className="flex flex-col gap-0.5">
        <Text as="h2" id="path-choice-heading" size="sm" weight="medium">
          How do you want to build?
        </Text>
        <Text as="p" size="xs" textColor="muted">
          {hasPatch
            ? 'Either way you end up with the same resources. Use whichever fits each step.'
            : 'Start with whichever piece you need first.'}
        </Text>
      </div>

      <ul className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        {TOOLS.map((tool) => (
          <li
            key={tool.key}
            className={cn(
              'bg-card flex flex-col gap-3 rounded-xl border px-4 py-3',
              // An open command needs the full width to stay on one line.
              expanded === tool.key && '@xl/main:col-span-2'
            )}>
            <ToolRow tool={tool} {...rowProps} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One tool: its icon, what it does and its button, with a CLI tool's command
 * opening underneath. The icon sits in a chip, like the next-step tiles.
 */
function ToolRow({
  tool,
  projectId,
  networkName,
  expanded,
  onToggle,
  onTool,
  onCreateNetwork,
}: {
  tool: Tool;
  projectId: string;
  networkName?: string;
  expanded: BuildTool | null;
  onToggle: (tool: BuildTool) => void;
  onTool: (tool: BuildTool) => void;
  onCreateNetwork: () => void;
}) {
  const open = expanded === tool.key;
  let command: ReactNode = null;
  if (open && tool.key === 'deploy') {
    command = networkName ? (
      <CommandBlock command={deployCommand(networkName)} />
    ) : (
      <NeedsNetwork onCreateNetwork={onCreateNetwork} />
    );
  }
  if (open && tool.key === 'connect') command = <ConnectCommands projectId={projectId} />;

  return (
    <>
      <span className="flex items-center gap-3">
        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Icon icon={tool.icon} size={15} className="text-icon-primary" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="sm" weight="medium">
            {tool.title}
          </Text>
          <Text size="xs" textColor="muted">
            {tool.description}
          </Text>
        </span>
        <Button
          type="secondary"
          theme="outline"
          size="xs"
          className="shrink-0"
          aria-expanded={tool.command ? open : undefined}
          onClick={() => {
            if (tool.command) onToggle(tool.key);
            onTool(tool.key);
          }}>
          {tool.command && open ? 'Hide command' : tool.action}
        </Button>
      </span>
      {command}
    </>
  );
}

/**
 * Exposing something on a laptop or server: install the tunnel plugin once,
 * then one command prints a public URL. Connectors reach the load balancer
 * directly, not through the network. The app does the same with a UI.
 */
export function ConnectCommands({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Text size="xs" textColor="muted">
        Install the tunnel plugin once:
      </Text>
      <CommandBlock command={CONNECT_PLUGIN_INSTALL} />
      <Text size="xs" textColor="muted">
        Then run this where the service is. It prints a public HTTPS URL and keeps it up until you
        press Ctrl+C. Change <code className="font-mono">localhost:3000</code> to your
        service&apos;s address.
      </Text>
      <CommandBlock command={tunnelCommand(projectId)} />
      <details className="group">
        <summary className="text-btn-primary cursor-pointer text-xs font-medium">
          Keep it running on a server
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <Text size="xs" textColor="muted">
            Install it as a service. It needs a service-account login, since your own session
            expires.
          </Text>
          <CommandBlock command={tunnelServiceCommands(projectId).join('\n')} />
        </div>
      </details>
      <Text size="xs" textColor="muted">
        Prefer an app?{' '}
        <a
          href={DATUM_DESKTOP_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          className="text-btn-primary font-medium hover:underline">
          Download Datum Desktop
        </a>
      </Text>
    </div>
  );
}

/**
 * The strip above the cards: the network's details, or a nudge to create one.
 * It is the same height and style as the health strip on an established
 * project's home page, so the page keeps one status row in both states.
 */
function NetworkLine({
  networkName,
  networkReady,
  network,
  networkHref,
  onCreateNetwork,
}: {
  networkName?: string;
  networkReady: boolean;
  network?: ComDatumapisNetworkingV1AlphaNetwork;
  networkHref?: string;
  onCreateNetwork: () => void;
}) {
  if (!networkName) {
    return (
      <div className="bg-card flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-1.5">
        <Icon icon={TriangleAlert} size={16} className="shrink-0 text-amber-500" aria-hidden />
        <Text size="sm" weight="medium">
          No network yet
        </Text>
        <Text size="sm" textColor="muted">
          Workloads run on a private network, so create one before deploying.
        </Text>
        <Button
          type="primary"
          theme="solid"
          size="xs"
          className="ml-auto"
          onClick={onCreateNetwork}>
          Create network
        </Button>
      </div>
    );
  }
  return (
    <div className="bg-card flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-1.5">
      <Icon
        icon={networkReady ? CircleCheck : LoaderCircle}
        size={16}
        className={cn(
          'shrink-0',
          networkReady ? 'text-green-600' : 'text-muted-foreground animate-spin'
        )}
        aria-hidden
      />
      <Text size="sm" weight="medium">
        {networkReady
          ? `Network ${networkName} is ready`
          : `Network ${networkName} is being created`}
      </Text>
      {networkReady && (
        <Text size="xs" textColor="muted" className="min-w-0 truncate font-mono">
          {networkSummary(network)}
        </Text>
      )}
      {networkHref && (
        <Link
          to={networkHref}
          className="text-btn-primary ml-auto text-sm font-medium hover:underline">
          View network
        </Link>
      )}
    </div>
  );
}

/** Instead of a deploy command that would fail: workloads need a network first. */
export function NeedsNetwork({ onCreateNetwork }: { onCreateNetwork: () => void }) {
  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3">
      <Text size="xs" textColor="muted" className="flex-1">
        A workload runs on your private network, and this project doesn&apos;t have one yet.
      </Text>
      <Button type="secondary" theme="outline" size="xs" onClick={onCreateNetwork}>
        Create network
      </Button>
    </div>
  );
}

/** "fd20:4b1e:9a00::/48 · IPv6 · MTU 1440", leaving out what the network hasn't reported yet. */
export function networkSummary(network: ComDatumapisNetworkingV1AlphaNetwork | undefined): string {
  return [
    network?.status?.ipam?.ipv6Prefix,
    (network?.spec?.ipFamilies ?? ['IPv6']).join(', '),
    `MTU ${network?.spec?.mtu ?? 1440}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
