import type { DockPrompt } from '@/features/project-dock/project-dock-context';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import type { DockWidgetDescriptor } from '@/modules/plugins/client/plugin-dock';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import type { DockWidgetProps } from '@/modules/plugins/types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Brain, PanelRight, X } from 'lucide-react';
import { useRef } from 'react';

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
  /** Hands the current conversation (if one has started) to the dock. */
  onMoveToDock: (chatId: string | undefined) => void;
}) {
  // The first id reported is the blank chat the widget mounts with, which the
  // server doesn't know until a message is sent; only later ids (the prompt's
  // chat, or one the person opened) can be handed to the dock.
  const firstChatIdRef = useRef<string>(undefined);
  const chatIdRef = useRef<string>(undefined);

  const props: DockWidgetProps = {
    onClose,
    prompt,
    placement: 'inline',
    // Short turns and sensible defaults for someone setting up a project.
    surface: { name: 'home-first-run', network },
    onChatChange: (chatId) => {
      firstChatIdRef.current ??= chatId;
      chatIdRef.current = chatId;
    },
  };
  const handOff = () =>
    onMoveToDock(chatIdRef.current === firstChatIdRef.current ? undefined : chatIdRef.current);

  return (
    <section
      aria-label={`${widget.title}, in the page`}
      data-testid="inline-patch"
      className="bg-card flex flex-col overflow-hidden rounded-xl border">
      {/* The only header: the widget draws no chrome of its own when inline. */}
      <header className="flex items-center gap-2 border-b px-4 py-1.5">
        <span className="bg-btn-primary flex size-5 shrink-0 items-center justify-center rounded-full text-white">
          <Icon icon={Brain} size={11} aria-hidden />
        </span>
        <Text size="xs" weight="medium" className="flex-1">
          {widget.title}
        </Text>
        <Button type="quaternary" theme="borderless" size="xs" onClick={handOff}>
          <Icon icon={PanelRight} size={13} />
          Open in side panel
        </Button>
        <Button
          type="quaternary"
          theme="borderless"
          size="xs"
          aria-label={`Close ${widget.title}`}
          onClick={onClose}>
          <Icon icon={X} size={14} />
        </Button>
      </header>
      <div className="relative h-[min(70vh,44rem)] min-h-0">
        <PluginErrorBoundary
          slug={widget.plugin.slug}
          displayName={widget.plugin.displayName}
          resetKey={widget.codeRef}>
          <LazyPluginComponent
            pluginRef={widget.pluginRef}
            codeRef={widget.codeRef}
            componentProps={props}
            fallback={<Skeleton className="h-full w-full" />}
          />
        </PluginErrorBoundary>
      </div>
    </section>
  );
}
