import { resolvePluginIcon } from '@/modules/plugins/client/icon-map';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import { useProjectDockWidgets } from '@/modules/plugins/client/plugin-dock';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@datum-cloud/datum-ui/sheet';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Activity, Suspense, useRef, useState } from 'react';

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
 * Header icon buttons for `portal.dock/project` plugin widgets (e.g. Patch
 * AI). Each widget gets a toggle button next to the built-in help/docs/task
 * icons; clicking one opens its content in a right-side sheet. Widgets stay
 * mounted (via `Activity`) once opened so switching or closing the sheet
 * preserves their state.
 */
export function ProjectDockTriggers({ projectId }: { projectId: string | undefined }) {
  const dockWidgets = useProjectDockWidgets(projectId);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const widgetsEverOpened = useRef(new Set<string>());
  if (activeWidgetId) widgetsEverOpened.current.add(activeWidgetId);

  const activeWidget = dockWidgets.find((widget) => widget.id === activeWidgetId);

  if (dockWidgets.length === 0) return null;

  return (
    <>
      {dockWidgets.map((widget) => (
        <Tooltip key={widget.id} message={widget.title} side="bottom">
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={() => setActiveWidgetId((prev) => (prev === widget.id ? null : widget.id))}
            aria-label={widget.title}
            className={cn(
              'h-7 w-7 rounded-lg p-0',
              activeWidgetId === widget.id ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
            )}>
            <Icon icon={resolvePluginIcon(widget.icon)} className="text-icon-header size-4" />
          </Button>
        </Tooltip>
      ))}

      <Sheet
        open={activeWidgetId !== null}
        onOpenChange={(open) => setActiveWidgetId(open ? activeWidgetId : null)}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>{activeWidget?.title ?? 'Panel'}</SheetTitle>
            <SheetDescription>{activeWidget?.title ?? 'Panel'}</SheetDescription>
          </SheetHeader>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {dockWidgets.map(
              (widget) =>
                widgetsEverOpened.current.has(widget.id) && (
                  <Activity
                    key={widget.id}
                    mode={activeWidgetId === widget.id ? 'visible' : 'hidden'}>
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
        </SheetContent>
      </Sheet>
    </>
  );
}
