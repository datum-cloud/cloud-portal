import { GUIDED_STARTS, type GuidedStart } from './home-mode';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ArrowUp, Box, Brain, ExternalLink, Globe, Laptop, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

export type PatchPrompt = {
  key: string;
  label: string;
  icon?: LucideIcon;
  /** What Patch is asked when this is chosen. */
  prompt: string;
};

const START_ICONS: Record<GuidedStart['key'], LucideIcon> = {
  app: Box,
  machine: Laptop,
  site: ExternalLink,
  domain: Globe,
};

/** The ready questions for a project with nothing built in it yet. */
export function firstRunPatchPrompts(networkName: string | undefined): PatchPrompt[] {
  return GUIDED_STARTS.map((start) => ({
    key: start.key,
    label: start.label,
    icon: START_ICONS[start.key],
    prompt: start.prompt(networkName),
  }));
}

/**
 * Patch on the home page: one card under the build tiles, in the same style,
 * with a few ready questions as chips and a box for anything else. Choosing a
 * chip or sending text opens the conversation in the page.
 */
export function AskPatchCard({
  description,
  prompts,
  placeholder,
  onAsk,
  onAskText,
}: {
  description: string;
  prompts: readonly PatchPrompt[];
  placeholder: string;
  onAsk: (prompt: string) => void;
  /** Free text; the caller adds what Patch needs to know about the project. */
  onAskText: (text: string) => void;
}) {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="bg-btn-primary/10 text-btn-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Icon icon={Brain} size={15} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col">
          <Text size="sm" weight="medium">
            Ask Patch
          </Text>
          <Text size="xs" textColor="muted">
            {description}
          </Text>
        </span>
      </div>
      <PatchChips prompts={prompts} onAsk={onAsk} />
      <PatchInput placeholder={placeholder} onAskText={onAskText} />
    </div>
  );
}

/**
 * Patch in place of the search box, at the top of a project with nothing in it
 * to search: the message box alone, or with ready questions under it.
 */
export function AskPatchBar({
  prompts,
  placeholder,
  onAsk,
  onAskText,
}: {
  prompts?: readonly PatchPrompt[];
  placeholder: string;
  onAsk: (prompt: string) => void;
  onAskText: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <PatchInput placeholder={placeholder} onAskText={onAskText} leading />
      {prompts && prompts.length > 0 && <PatchChips prompts={prompts} onAsk={onAsk} />}
    </div>
  );
}

function PatchChips({
  prompts,
  onAsk,
}: {
  prompts: readonly PatchPrompt[];
  onAsk: (prompt: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {prompts.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onAsk(item.prompt)}
            className="hover:border-btn-primary hover:bg-btn-primary/5 flex h-8 items-center gap-2 rounded-full border px-3 text-left text-sm transition-colors">
            {item.icon && (
              <Icon icon={item.icon} size={14} className="text-btn-primary shrink-0" aria-hidden />
            )}
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The same look as Patch's own message box: one rounded box in the accent
 * colour's border, the text inside it with no border of its own, and a round
 * filled send button at the end. `leading` puts Patch's mark at the start,
 * for when the box stands alone with no "Ask Patch" title above it.
 */
function PatchInput({
  placeholder,
  onAskText,
  leading,
}: {
  placeholder: string;
  onAskText: (text: string) => void;
  leading?: boolean;
}) {
  const [text, setText] = useState('');

  return (
    <form
      className="bg-card border-primary/30 focus-within:border-primary/60 flex items-center gap-2 rounded-2xl border py-1.5 pr-1.5 pl-4 shadow-xs transition-colors"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onAskText(text);
        setText('');
      }}>
      {leading && <Icon icon={Brain} size={15} className="text-btn-primary shrink-0" aria-hidden />}
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label="Ask Patch"
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      <button
        type="submit"
        aria-label="Send to Patch"
        disabled={!text.trim()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-full p-1.5 transition-colors disabled:opacity-40">
        <Icon icon={ArrowUp} className="size-4" aria-hidden />
      </button>
    </form>
  );
}
