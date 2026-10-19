import {
  CONNECT_PLUGIN_INSTALL,
  GUIDED_STARTS,
  deployCommand,
  freeTextPrompt,
  tunnelCommand,
  tunnelServiceCommands,
  type GuidedStart,
} from './home-mode';
import { CommandBlock } from './next-step';
import type { ComDatumapisNetworkingV1AlphaNetwork } from '@/modules/control-plane/networking';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  ArrowRight,
  Box,
  Brain,
  CircleCheck,
  ExternalLink,
  Globe,
  Laptop,
  Plug,
  Send,
  Server,
  Split,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

const START_ICONS: Record<GuidedStart['key'], LucideIcon> = {
  app: Box,
  machine: Laptop,
  site: ExternalLink,
  domain: Globe,
};

export type BuildTool = 'deploy' | 'loadBalancer' | 'connect' | 'domain';

const TOOLS: readonly {
  key: BuildTool;
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  /** The action is a CLI command, so it reads as code. */
  command?: boolean;
}[] = [
  {
    key: 'connect',
    icon: Plug,
    title: 'Connect a machine',
    description: 'Expose a service from a laptop or your own servers',
    action: 'datumctl connect',
    command: true,
  },
  {
    key: 'deploy',
    icon: Server,
    title: 'Deploy a workload',
    description: 'Run containers or VMs on the network',
    action: 'datumctl compute deploy',
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

/**
 * Screen 2 of first-run setup: the network is ready, so ask how the person
 * wants to build the rest. Both paths make the same resources; the choice only
 * changes how the home page guides them, and they can switch later.
 *
 * It stays until the project has something besides its network: nothing here
 * switches modes. Toolbox rows act in place (the deploy command opens inline,
 * the dialogs open over the page) and Patch opens in its side panel, so the
 * person can try either and come back. Without Patch, only the toolbox shows.
 */
export function PathChoice({
  projectId,
  networkName,
  network,
  networkHref,
  onTool,
  onAskPatch,
}: {
  projectId: string;
  networkName: string;
  /** The ready network, for its address range and MTU. */
  network?: ComDatumapisNetworkingV1AlphaNetwork;
  /** The network's page in the Networks plugin, when it is installed. */
  networkHref?: string;
  /** A toolbox row's action. The deploy command is shown here; the rest are the page's. */
  onTool: (tool: BuildTool) => void;
  /** Undefined when Patch isn't installed for this project. */
  onAskPatch?: (prompt: string) => void;
}) {
  const [text, setText] = useState('');
  // The CLI rows open their commands in place; one at a time.
  const [expanded, setExpanded] = useState<BuildTool | null>(null);

  return (
    <section className="flex flex-col gap-5" aria-labelledby="path-choice-heading">
      <div className="bg-card flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-5 py-3.5">
        <Icon icon={CircleCheck} size={18} className="shrink-0 text-green-600" aria-hidden />
        <Text size="sm" weight="medium">
          Network {networkName} is ready
        </Text>
        <Text size="xs" textColor="muted" className="min-w-0 truncate font-mono">
          {networkSummary(network)}
        </Text>
        {networkHref && (
          <Link
            to={networkHref}
            className="text-btn-primary ml-auto text-sm font-medium hover:underline">
            View network
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Title as="h2" id="path-choice-heading" level={4} weight="normal" className="font-title">
          How do you want to build?
        </Title>
        <Text size="sm" textColor="muted">
          Either way you end up with the same resources. Use whichever fits each step.
        </Text>
      </div>

      <div className={cn('grid gap-5', onAskPatch && '@3xl/main:grid-cols-2')}>
        <PathCard
          icon={Wrench}
          title="I'll build it myself"
          description="You know what you need. Get the full toolbox, each tool already pointed at your network.">
          <ul className="flex flex-col">
            {TOOLS.map((tool) => (
              <li key={tool.key} className="flex flex-col gap-3 border-t py-3">
                <span className="flex items-center gap-3">
                  <Icon icon={tool.icon} size={16} className="text-icon-quaternary shrink-0" />
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
                    className={tool.command ? 'shrink-0 font-mono' : 'shrink-0'}
                    aria-expanded={tool.command ? expanded === tool.key : undefined}
                    onClick={() => {
                      if (tool.command)
                        setExpanded((open) => (open === tool.key ? null : tool.key));
                      onTool(tool.key);
                    }}>
                    {tool.action}
                  </Button>
                </span>
                {expanded === 'deploy' && tool.key === 'deploy' && (
                  <CommandBlock command={deployCommand(networkName)} />
                )}
                {expanded === 'connect' && tool.key === 'connect' && (
                  <ConnectCommands projectId={projectId} />
                )}
              </li>
            ))}
          </ul>
        </PathCard>

        {onAskPatch && (
          <PathCard
            icon={Brain}
            title="Help me connect something"
            description="Tell Patch what you want online. It plans each piece, explains it, and waits for your OK before creating anything.">
            <div className="bg-muted/50 flex flex-col gap-2.5 rounded-lg p-4">
              <Text size="sm" weight="medium">
                What do you want to connect first?
              </Text>
              {GUIDED_STARTS.map((start) => (
                <button
                  key={start.key}
                  type="button"
                  onClick={() => onAskPatch(start.prompt(networkName))}
                  className="bg-card hover:border-btn-primary flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors">
                  <Icon
                    icon={START_ICONS[start.key]}
                    size={15}
                    className="text-btn-primary shrink-0"
                  />
                  <Text as="span" size="sm" className="flex-1">
                    {start.label}
                  </Text>
                  <Icon icon={ArrowRight} size={14} className="text-icon-quaternary shrink-0" />
                </button>
              ))}
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!text.trim()) return;
                  onAskPatch(freeTextPrompt(text, networkName));
                  setText('');
                }}>
                <Input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Or describe it in your own words..."
                  aria-label="Describe what you want to connect"
                  className="bg-card"
                />
                <Button
                  htmlType="submit"
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  aria-label="Ask Patch"
                  disabled={!text.trim()}>
                  <Icon icon={Send} size={14} className="text-btn-primary" />
                </Button>
              </form>
            </div>
          </PathCard>
        )}
      </div>
    </section>
  );
}

/**
 * Exposing something on a laptop or server: install the tunnel plugin once,
 * then one command prints a public URL. Connectors reach the load balancer
 * directly, not through the network. The app does the same with a UI.
 */
function ConnectCommands({ projectId }: { projectId: string }) {
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

function PathCard({
  icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl border p-6">
      <div className="flex items-start gap-3.5">
        <span className="bg-btn-primary/10 text-btn-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon icon={icon} size={20} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <Text size="base" weight="medium">
            {title}
          </Text>
          <Text size="sm" textColor="muted">
            {description}
          </Text>
        </span>
      </div>
      {children}
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
