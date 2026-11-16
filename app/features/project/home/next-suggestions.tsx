import { AskPatchCard } from './ask-patch-card';
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
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Globe, Network, Plug, Server, Split, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

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

  return (
    <section className="flex flex-col gap-3" aria-labelledby="next-suggestions-heading">
      <div className="flex flex-col gap-0.5">
        <Text as="h2" id="next-suggestions-heading" size="sm" weight="medium">
          Suggested next steps
        </Text>
        <Text as="p" size="xs" textColor="muted">
          {onAskPatch
            ? 'Do it yourself, or hand it to Patch.'
            : 'Picked from what this project has.'}
        </Text>
      </div>
      {/* Each step is a compact tile of its own, side by side; Patch, when
          it is installed, is one more card underneath with the same steps as
          questions. */}
      <ul className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.tool}
            className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon icon={TOOL_ICONS[suggestion.tool]} size={15} className="text-icon-primary" />
            </span>
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
      {onAskPatch && (
        <AskPatchCard
          description="Hand a step to Patch. It plans each piece and waits for your OK before creating anything."
          prompts={suggestions.map((suggestion) => ({
            key: suggestion.tool,
            label: suggestion.patchLabel,
            icon: TOOL_ICONS[suggestion.tool],
            prompt: suggestion.patchPrompt,
          }))}
          placeholder="Or describe what you want to connect..."
          onAsk={onAskPatch}
          onAskText={(text) => onAskPatch(freeTextPrompt(text, networkName, networkCount))}
        />
      )}
    </section>
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
      <CommandPopover onOpen={() => onTool('connect')}>
        <ConnectCommands projectId={projectId} />
      </CommandPopover>
    );
  }
  if (tool === 'deploy') {
    return (
      <CommandPopover onOpen={() => onTool('deploy')}>
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

/**
 * A CLI step: the button opens the command to copy. It looks like the other
 * rows' buttons, so the list reads as one set of actions.
 */
function CommandPopover({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return (
    <Popover onOpenChange={(open) => open && onOpen()}>
      <PopoverTrigger asChild>
        <Button type="secondary" theme="outline" size="xs" className="shrink-0">
          Show command
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(36rem,90vw)]">
        {children}
      </PopoverContent>
    </Popover>
  );
}
