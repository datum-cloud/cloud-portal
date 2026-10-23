import type { DockPrompt } from '@/features/project-dock/project-dock-context';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import type { DockWidgetDescriptor } from '@/modules/plugins/client/plugin-dock';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import type { DockWidgetProps } from '@/modules/plugins/types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Brain, PanelRight, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Patch embedded in the home page, the same widget the dock shows, mounted
 * wide. It keeps track of which conversation it is on so "Open in side panel"
 * can carry that conversation into the dock rather than starting over.
 */
export function InlinePatch({
  widget,
  prompt,
  network,
  onClose,
  onMoveToDock,
}: {
  widget: DockWidgetDescriptor;
  prompt?: DockPrompt;
  /** The project's network, so Patch can name it and default to it. */
  network?: string;
  onClose: () => void;
  /** Hands the saved conversation to the dock. */
  onMoveToDock: (chatId: string) => void;
}) {
  // The widget reports a conversation only once the assistant has saved it,
  // which happens when a reply finishes; until then there is nothing the dock
  // could open, so moving waits.
  const [savedChatId, setSavedChatId] = useState<string>();

  const props: DockWidgetProps = {
    onClose,
    prompt,
    placement: 'inline',
    // Short turns and sensible defaults for someone setting up a project.
    surface: { name: 'home-first-run', network },
    onChatChange: setSavedChatId,
  };

  return (
    <section
      aria-label={`${widget.title}, in the page`}
      data-testid="inline-patch"
      className="bg-card flex max-h-[min(80vh,52rem)] flex-col overflow-hidden rounded-2xl border">
      {/* The only header: the widget draws no chrome of its own when inline.
          Its side padding matches the conversation's, so the icon lines up
          with Patch's avatar below it. */}
      <header className="flex items-center gap-2 px-7 pt-5 pb-1">
        <Icon icon={Brain} size={16} className="text-btn-primary shrink-0" aria-hidden />
        <Text size="sm" weight="medium" className="flex-1">
          {widget.title}
        </Text>
        <Tooltip
          message={
            savedChatId ? 'Continue in the side panel' : 'Available once Patch finishes replying'
          }>
          <span className="inline-flex">
            <Button
              type="quaternary"
              theme="borderless"
              size="xs"
              disabled={!savedChatId}
              onClick={() => savedChatId && onMoveToDock(savedChatId)}>
              <Icon icon={PanelRight} size={13} />
              Open in side panel
            </Button>
          </span>
        </Tooltip>
        <Button
          type="quaternary"
          theme="borderless"
          size="xs"
          aria-label={`Close ${widget.title}`}
          onClick={onClose}>
          <Icon icon={X} size={14} />
        </Button>
      </header>
      {/* Grows with the conversation up to the section's max height, then
          the conversation scrolls inside it. */}
      <div className="relative flex min-h-0 flex-col">
        <PluginErrorBoundary
          slug={widget.plugin.slug}
          displayName={widget.plugin.displayName}
          resetKey={widget.codeRef}>
          <LazyPluginComponent
            pluginRef={widget.pluginRef}
            codeRef={widget.codeRef}
            componentProps={props}
            fallback={<Skeleton className="mx-7 mb-6 h-32" />}
          />
        </PluginErrorBoundary>
      </div>
    </section>
  );
}
