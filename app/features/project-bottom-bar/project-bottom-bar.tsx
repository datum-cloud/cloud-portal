import { liveUpdatesStore, selectPausedCount } from '@/modules/watch';
import { useProjectContext } from '@/providers/project.provider';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Brain, PlayIcon, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Suspense, useRef, useState } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

const AssistantWorkspace = lazyWithRetry(() =>
  import('@/features/assistant').then((m) => ({ default: m.AssistantWorkspace }))
);

type PanelType = 'chat' | 'docs';

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

/**
 * A resume-all-tables control, not a panel toggle — so it is a sibling of
 * `ToolbarButton` rather than a variant of it. It reads `pausedCount`
 * across every project and zone, not just the one currently on screen: a
 * reader can pause a table, navigate away, and forget about it, and this is
 * the one place a stray pause elsewhere in the session surfaces again.
 *
 * Always renders, including at zero paused tables — otherwise there is
 * nowhere a reader can tell live updates exist as a concept at all. It is
 * only ENABLED once `pausedCount > 0`; at zero it is a muted, passive
 * indicator rather than a dead button, and its tooltip/`aria-label` say so
 * explicitly (`Live updates — no tables paused`) rather than staying silent
 * until there is something to act on.
 *
 * The disabled state is applied to the inner `Button` (a real `disabled`
 * attribute, not just a visual treatment — the control genuinely does
 * nothing at zero), but the `Tooltip` wraps an outer `<span aria-disabled>`
 * instead of the button directly. A `disabled` native button suppresses
 * pointer events entirely, so Radix's tooltip trigger would never see the
 * hover and the zero-state copy would be unreachable — same pattern as
 * `QuotaGuard`.
 *
 * Exported (unlike `ToolbarButton`) so the cypress component suite can mount
 * it directly, without pulling in `ProjectBottomBar`'s project-context and
 * lazy-loaded assistant-panel dependencies.
 */
export function LiveUpdatesResumeAllControl() {
  const queryClient = useQueryClient();

  const pausedCount = useSyncExternalStoreWithSelector(
    liveUpdatesStore.subscribe,
    liveUpdatesStore.getSnapshot,
    liveUpdatesStore.getServerSnapshot,
    selectPausedCount
  );

  const isActive = pausedCount > 0;
  const displayCount = pausedCount > 99 ? '99+' : pausedCount;
  const label = isActive
    ? `Live updates — ${pausedCount} ${pausedCount === 1 ? 'table' : 'tables'} paused, click to resume all`
    : 'Live updates — no tables paused';

  const handleResumeAll = () => {
    // The store can tell us which paused keys currently have a table
    // mounted for them — those are the only ones with on-screen data to
    // catch up — but it has no QueryClient of its own to invalidate them
    // with, so that half happens here.
    const keysToCatchUp = liveUpdatesStore.resumeAll();
    for (const key of keysToCatchUp) {
      queryClient.invalidateQueries({ queryKey: [...key] });
    }
  };

  return (
    <Tooltip message={label} side="top">
      <span
        aria-disabled={!isActive}
        className={cn('inline-block rounded-lg', !isActive && '[&>*]:pointer-events-none')}>
        <Button
          data-e2e="live-updates-resume-all"
          htmlType="button"
          type="quaternary"
          theme="borderless"
          size="small"
          disabled={!isActive}
          onClick={handleResumeAll}
          aria-label={label}
          className="hover:bg-sidebar-accent relative h-7 w-7 rounded-lg p-0">
          <Icon icon={PlayIcon} className="text-icon-header size-4" />
          {isActive && (
            <Badge
              data-testid="live-updates-resume-all-badge"
              type="tertiary"
              theme="solid"
              className="bg-primary text-primary-foreground text-2xs absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 leading-0">
              {displayCount}
            </Badge>
          )}
        </Button>
      </span>
    </Tooltip>
  );
}

// Mirrors the shared workspace's rail + empty-state layout (history collapsed by
// default) so the lazy-load fallback matches what mounts in.
function ChatPanelSkeleton() {
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
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [panelHeight, setPanelHeight] = useState(400);
  const docsEverOpened = useRef(false);
  if (activePanel === 'docs') docsEverOpened.current = true;

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
                <Activity mode={activePanel === 'chat' ? 'visible' : 'hidden'}>
                  <Suspense fallback={<ChatPanelSkeleton />}>
                    <AssistantWorkspace key={project?.name ?? 'no-project'} />
                  </Suspense>
                </Activity>
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
          <ToolbarButton
            panel="chat"
            icon={Brain}
            label="Patch AI"
            isActive={activePanel === 'chat'}
            onClick={handlePanelToggle}
          />
          {/* <ToolbarButton
            panel="terminal"
            icon={Terminal}
            label="Terminal"
            isActive={activePanel === 'terminal'}
            onClick={handlePanelToggle}
          /> */}
          <ToolbarButton
            panel="docs"
            icon={BookOpen}
            label="Docs"
            isActive={activePanel === 'docs'}
            onClick={handlePanelToggle}
          />
          <LiveUpdatesResumeAllControl />
        </div>
      </div>
    </div>
  );
}
