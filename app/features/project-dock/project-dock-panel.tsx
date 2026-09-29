import { useProjectDock } from './project-dock-context';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { XIcon } from 'lucide-react';
import { Activity, Suspense, useRef } from 'react';

// Mirrors a chat-like widget's rail + empty-state layout (history collapsed by
// default) so the lazy-load fallback matches what most dock widgets mount in.
function DockPanelSkeleton() {
  return (
    <div className="bg-background flex h-full w-full overflow-hidden">
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r py-3">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8">
        <div className="mb-8 flex flex-col items-center">
          <Skeleton className="mb-4 size-16 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-lg" />
        </div>

        <Skeleton className="h-24 w-full rounded-2xl" />

        <div className="mt-4 flex flex-col gap-1">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Docked right-hand column for the open `portal.dock/project` widget. It sits
 * beside the page content (which narrows to make room) instead of overlaying
 * it; below `md` it covers the content area, since there is no room for both.
 * It slides in and out from the right with the sidebar's easing.
 *
 * Widgets stay mounted (via `Activity`) once opened, so closing the panel or
 * switching widgets keeps their state, e.g. an in-progress chat.
 */
export function ProjectDockPanel() {
  const { widgets, activeWidgetId, close } = useProjectDock();
  const widgetsEverOpened = useRef(new Set<string>());
  // Keep showing the last widget while the panel slides closed.
  const lastWidgetId = useRef<string | null>(null);
  if (activeWidgetId) {
    widgetsEverOpened.current.add(activeWidgetId);
    lastWidgetId.current = activeWidgetId;
  }

  // Rendered (closed) as soon as there are widgets, so the first open animates too.
  if (widgets.length === 0) return null;

  const open = activeWidgetId !== null;
  const shownWidgetId = activeWidgetId ?? lastWidgetId.current;
  const shownWidget = widgets.find((widget) => widget.id === shownWidgetId);

  return (
    <aside
      aria-label={shownWidget?.title ?? 'Panel'}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'bg-background fixed inset-x-0 top-12 bottom-0 z-40 overflow-hidden',
        'transition-[translate,width] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        // Desktop: in the layout's flex row, widening from 0 so the content narrows with it.
        'md:static md:z-auto md:shrink-0 md:translate-x-0',
        open ? 'translate-x-0 md:w-[32rem]' : 'pointer-events-none translate-x-full md:w-0'
      )}>
      {/* Fixed width so the widget doesn't reflow while the column animates. */}
      <div className="relative flex h-full w-full flex-col border-l md:w-[32rem]">
        <Tooltip message="Close" side="left">
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={close}
            aria-label="Close panel"
            className="hover:bg-sidebar-accent absolute top-2 right-2 z-10 h-7 w-7 rounded-lg p-0">
            <Icon icon={XIcon} className="text-icon-header size-4" />
          </Button>
        </Tooltip>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {widgets.map(
            (widget) =>
              widgetsEverOpened.current.has(widget.id) && (
                <Activity key={widget.id} mode={shownWidgetId === widget.id ? 'visible' : 'hidden'}>
                  <PluginErrorBoundary
                    slug={widget.plugin.slug}
                    displayName={widget.plugin.displayName}
                    resetKey={widget.codeRef}>
                    <Suspense fallback={<DockPanelSkeleton />}>
                      <LazyPluginComponent
                        pluginRef={widget.pluginRef}
                        codeRef={widget.codeRef}
                        fallback={<DockPanelSkeleton />}
                      />
                    </Suspense>
                  </PluginErrorBoundary>
                </Activity>
              )
          )}
        </div>
      </div>
    </aside>
  );
}
