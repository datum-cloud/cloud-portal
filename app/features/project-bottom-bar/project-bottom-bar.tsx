import { resolvePluginIcon } from '@/modules/plugins/client/icon-map';
import { LazyPluginComponent } from '@/modules/plugins/client/lazy-plugin-component';
import { useProjectDockWidgets } from '@/modules/plugins/client/plugin-dock';
import { PluginErrorBoundary } from '@/modules/plugins/client/plugin-error-boundary';
import { useProjectContext } from '@/providers/project.provider';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BookOpen, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Suspense, useEffect, useRef, useState } from 'react';

/**
 * Which panel is open in the bottom bar. `'docs'` is the one host-owned
 * panel; any other string is the `id` of a plugin-contributed
 * `portal.dock/project` widget (see `useProjectDockWidgets`).
 */
type PanelType = 'docs' | (string & {});

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.8;

function DocsPanel() {
  return (
    <iframe
      src="https://www.datum.net/docs"
      className="h-full w-full border-0"
      title="Documentation"
    />
  );
}

interface ToolbarButtonProps {
  panel: PanelType;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: (panel: PanelType) => void;
}

function ToolbarButton({ panel, icon: icon, label, isActive, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip message={label} side="top">
      <Button
        type="quaternary"
        theme="borderless"
        size="small"
        onClick={() => onClick(panel)}
        aria-label={label}
        className={cn(
          'h-7 w-7 rounded-lg p-0',
          isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
        )}>
        <Icon icon={icon} className="text-icon-header size-4" />
      </Button>
    </Tooltip>
  );
}

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

export function ProjectBottomBar() {
  const { project } = useProjectContext();
  const dockWidgets = useProjectDockWidgets(project?.name);

  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [panelHeight, setPanelHeight] = useState(400);
  const docsEverOpened = useRef(false);
  if (activePanel === 'docs') docsEverOpened.current = true;

  // Widgets are mount-gated the same way `docs` is: once opened, kept mounted
  // (via Activity) so switching panels preserves state.
  const widgetsEverOpened = useRef(new Set<string>());
  if (activePanel && activePanel !== 'docs') widgetsEverOpened.current.add(activePanel);

  // Preserve today's UX default: the first time a project's dock widgets
  // become available, auto-select the first one (today that's always the
  // Patch AI chat widget) rather than requiring the user to click it. Runs
  // once per project — a user closing the panel afterwards should stay closed.
  const defaultAppliedFor = useRef<string | null>(null);
  useEffect(() => {
    const projectKey = project?.name ?? null;
    if (!projectKey) return;
    if (defaultAppliedFor.current === projectKey) return;
    if (dockWidgets.length === 0) return;

    defaultAppliedFor.current = projectKey;
    setActivePanel(dockWidgets[0].id);
  }, [project?.name, dockWidgets]);

  const handlePanelToggle = (panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const max = window.innerHeight * MAX_HEIGHT_RATIO;
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(max, startHeight + delta)));
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const startY = e.touches[0].clientY;
    const startHeight = panelHeight;

    const onMove = (e: TouchEvent) => {
      const delta = startY - e.touches[0].clientY;
      const max = window.innerHeight * MAX_HEIGHT_RATIO;
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(max, startHeight + delta)));
    };

    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  return (
    <div className="relative shrink-0">
      <AnimatePresence initial={false}>
        {activePanel && (
          <motion.div
            key="panel"
            initial={{ height: 0 }}
            animate={{ height: panelHeight }}
            exit={{ height: 0 }}
            transition={isDragging ? { duration: 0 } : { type: 'tween', duration: 0.3 }}
            className="dark:bg-accent bg-card relative z-40 flex flex-col overflow-hidden border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] [clip-path:inset(-16px_0_0_0)]">
            {/* Fixed inner height so content layout stays stable while the
                outer wrapper animates open/closed. In-flow height (not
                absolute) reserves space so the page above can scroll clear. */}
            <div className="relative flex shrink-0 flex-col" style={{ height: panelHeight }}>
              {/* Drag handle */}
              <div
                className="group absolute top-0 left-1/2 z-10 flex h-4 w-full shrink-0 -translate-x-1/2 cursor-ns-resize items-center justify-center bg-none"
                onMouseDown={handleDragStart}
                onTouchStart={handleTouchStart}>
                <div className="bg-muted-foreground/30 group-hover:bg-muted-foreground/60 h-1 w-8 rounded-full transition-colors" />
              </div>

              {/* Panel content — Activity keeps each panel mounted while the container
                  is open, preserving state (e.g. iframe scroll) when switching tabs */}
              <div className="relative min-h-0 flex-1 overflow-hidden">
                {isDragging && <div className="absolute inset-0 z-50" />}
                {dockWidgets.map(
                  (widget) =>
                    widgetsEverOpened.current.has(widget.id) && (
                      <Activity
                        key={widget.id}
                        mode={activePanel === widget.id ? 'visible' : 'hidden'}>
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
                {docsEverOpened.current && (
                  <Activity mode={activePanel === 'docs' ? 'visible' : 'hidden'}>
                    <DocsPanel />
                  </Activity>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar — same chrome as SidebarFooter (border-t + p-2 + h-8 controls) */}
      <div className="bg-sidebar border-sidebar-border relative z-50 flex shrink-0 items-center justify-end overflow-hidden border-t p-2">
        <div className="border-sidebar-border flex h-8 items-center gap-1 border-l pl-4">
          <span className="text-foreground mr-2 text-xs">Developer Tools</span>
          {dockWidgets.map((widget) => (
            <ToolbarButton
              key={widget.id}
              panel={widget.id}
              icon={resolvePluginIcon(widget.icon)}
              label={widget.title}
              isActive={activePanel === widget.id}
              onClick={handlePanelToggle}
            />
          ))}
          <ToolbarButton
            panel="docs"
            icon={BookOpen}
            label="Docs"
            isActive={activePanel === 'docs'}
            onClick={handlePanelToggle}
          />
        </div>
      </div>
    </div>
  );
}
