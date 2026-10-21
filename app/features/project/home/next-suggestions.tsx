import { CommandBlock } from './command-block';
import {
  deployCommand,
  freeTextPrompt,
  suggestNextSteps,
  type BuildTool,
  type Suggestion,
} from './home-mode';
import { ConnectCommands, NeedsNetwork } from './path-choice';
import type { SetupStep } from './setup-progress.helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  ArrowRight,
  Brain,
  Globe,
  Network,
  Plug,
  Send,
  Server,
  Split,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const TOOL_ICONS: Record<Suggestion['tool'], LucideIcon> = {
  network: Network,
  connect: Plug,
  deploy: Server,
  loadBalancer: Split,
  domain: Globe,
};

/**
 * A condensed version of the first-run toolbox and Patch cards, for a project
 * that already has something in it: a few next steps picked from what the
 * project has, each one click away, and the same steps as questions for Patch.
 */
export function NextSuggestions({
  projectId,
  steps,
  networkName,
  networkCount,
  onTool,
  onCreateNetwork,
  onAskPatch,
}: {
  projectId: string;
  steps: SetupStep[];
  /** The project's network when it has exactly one; undefined otherwise. */
  networkName?: string;
  networkCount: number;
  /** The ALB and domain dialogs; the CLI tools open here. */
  onTool: (tool: BuildTool) => void;
  onCreateNetwork: () => void;
  /** Undefined when Patch isn't installed for this project. */
  onAskPatch?: (prompt: string) => void;
}) {
  const suggestions = suggestNextSteps(steps, networkCount);
  const [text, setText] = useState('');

  return (
    <section className="flex flex-col gap-3" aria-labelledby="next-suggestions-heading">
      <div className="flex flex-col gap-0.5">
        <Text as="h2" id="next-suggestions-heading" size="sm" weight="medium">
          Suggested next steps
        </Text>
        <Text as="p" size="xs" textColor="muted">
          Do it yourself, or hand it to Patch.
        </Text>
      </div>
      {/* One card, split down the middle, with the same plain rows on both
          sides; only the text input keeps a border of its own. */}
      <div
        className={cn(
          'bg-card grid rounded-xl border',
          onAskPatch && 'divide-y @3xl/main:grid-cols-2 @3xl/main:divide-x @3xl/main:divide-y-0'
        )}>
        <div className="flex flex-col px-5 py-2">
          <CardLabel icon={Wrench}>Build it yourself</CardLabel>
          <ul className="flex flex-col">
            {suggestions.map((suggestion) => (
              <li key={suggestion.tool} className="flex items-center gap-3 border-t py-2.5">
                <Icon
                  icon={TOOL_ICONS[suggestion.tool]}
                  size={15}
                  className="text-icon-quaternary shrink-0"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <Text size="sm" weight="medium">
                    {suggestion.title}
                  </Text>
                  <Text size="xs" textColor="muted">
                    {suggestion.description}
                  </Text>
                </span>
                <SuggestionAction
                  suggestion={suggestion}
                  projectId={projectId}
                  networkName={networkName}
                  networkCount={networkCount}
                  onTool={onTool}
                  onCreateNetwork={onCreateNetwork}
                />
              </li>
            ))}
          </ul>
        </div>

        {onAskPatch && (
          <div className="flex flex-col px-5 py-2">
            <CardLabel icon={Brain} accent>
              Ask Patch
            </CardLabel>
            <ul className="flex flex-col">
              {suggestions.map((suggestion) => (
                <li key={suggestion.tool} className="border-t">
                  <button
                    type="button"
                    onClick={() => onAskPatch(suggestion.patchPrompt)}
                    className="group hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-3 text-left transition-colors">
                    <Icon
                      icon={TOOL_ICONS[suggestion.tool]}
                      size={15}
                      className="text-btn-primary shrink-0"
                    />
                    <Text as="span" size="sm" className="flex-1">
                      {suggestion.patchLabel}
                    </Text>
                    <Icon
                      icon={ArrowRight}
                      size={13}
                      className="text-icon-quaternary shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="flex items-center gap-2 border-t pt-3 pb-1"
              onSubmit={(event) => {
                event.preventDefault();
                if (!text.trim()) return;
                onAskPatch(freeTextPrompt(text, networkName, networkCount));
                setText('');
              }}>
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Or describe what you want to connect..."
                aria-label="Ask Patch"
              />
              <Button
                htmlType="submit"
                type="quaternary"
                theme="borderless"
                size="small"
                aria-label="Send to Patch"
                disabled={!text.trim()}>
                <Icon icon={Send} size={14} className="text-btn-primary" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

function CardLabel({
  icon,
  accent = false,
  children,
}: {
  icon: LucideIcon;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 py-2">
      <Icon
        icon={icon}
        size={14}
        className={accent ? 'text-btn-primary' : 'text-icon-quaternary'}
        aria-hidden
      />
      <Text size="xs" weight="medium" textColor="muted">
        {children}
      </Text>
    </div>
  );
}

function SuggestionAction({
  suggestion,
  projectId,
  networkName,
  networkCount,
  onTool,
  onCreateNetwork,
}: {
  suggestion: Suggestion;
  projectId: string;
  networkName?: string;
  networkCount: number;
  onTool: (tool: BuildTool) => void;
  onCreateNetwork: () => void;
}) {
  const { tool } = suggestion;
  if (tool === 'network') {
    return (
      <Button type="primary" theme="solid" size="xs" className="shrink-0" onClick={onCreateNetwork}>
        Create network
      </Button>
    );
  }
  if (tool === 'connect') {
    return (
      <CommandPopover label="datumctl connect" onOpen={() => onTool('connect')}>
        <ConnectCommands projectId={projectId} />
      </CommandPopover>
    );
  }
  if (tool === 'deploy') {
    return (
      <CommandPopover label="datumctl compute deploy" onOpen={() => onTool('deploy')}>
        {networkCount > 0 ? (
          // With several networks, a placeholder rather than an arbitrary pick.
          <CommandBlock command={deployCommand(networkName ?? '<network>')} />
        ) : (
          <NeedsNetwork onCreateNetwork={onCreateNetwork} />
        )}
      </CommandPopover>
    );
  }
  return (
    <Button
      type="secondary"
      theme="outline"
      size="xs"
      className="shrink-0"
      onClick={() => onTool(tool)}>
      {tool === 'loadBalancer' ? 'Add ALB' : 'Add domain'}
    </Button>
  );
}

function CommandPopover({
  label,
  onOpen,
  children,
}: {
  label: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <Popover onOpenChange={(open) => open && onOpen()}>
      <PopoverTrigger asChild>
        <Button type="secondary" theme="outline" size="xs" className="shrink-0 font-mono">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(36rem,90vw)]">
        {children}
      </PopoverContent>
    </Popover>
  );
}
