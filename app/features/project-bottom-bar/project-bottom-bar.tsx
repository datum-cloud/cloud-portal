import { useProjectContext } from '@/providers/project.provider';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BookOpen, Brain, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Suspense, useRef, useState } from 'react';

const TerminalPanel = lazyWithRetry(() =>
  import('./terminal-panel').then((m) => ({ default: m.TerminalPanel }))
);

const ChatPanel = lazyWithRetry(() =>
  import('./chat/chat-panel').then((m) => ({ default: m.ChatPanel }))
);

type PanelType = 'terminal' | 'chat' | 'docs';

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

function ChatPanelSkeleton() {
  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="bg-card hidden h-full w-[250px] shrink-0 flex-col gap-3 p-3 sm:flex">
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex flex-col gap-2 pt-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-3/4 rounded-lg" />
        </div>
      </div>

      {/* Resize handle */}
      <div className="bg-muted hidden w-4 shrink-0 sm:block" />

      {/* Chat area skeleton */}
      <div className="bg-muted flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-3 p-4">
          <Skeleton className="h-4 w-24 rounded" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-56 rounded-xl" />
            <Skeleton className="h-9 w-44 rounded-xl" />
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-9 w-52 rounded-xl" />
            <Skeleton className="h-9 w-60 rounded-xl" />
          </div>
        </div>

        {/* Input skeleton */}
        <div className="px-2 pb-2">
          <div className="mx-auto w-full sm:w-1/2">
            <Skeleton className="h-[52px] w-full rounded-[28px]" />
          </div>
          <div className="mt-1 flex justify-center">
            <Skeleton className="h-3 w-48 rounded" />
          </div>
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
    <div className="relative">
      <AnimatePresence>
        {activePanel && (
          <motion.div
            key="panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="dark:bg-accent bg-card absolute right-0 bottom-full left-0 z-40 flex flex-col border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] [clip-path:inset(-20px_0_0_0)]"
            style={{ height: panelHeight }}>
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
                  <ChatPanel key={project?.name ?? 'no-project'} />
                </Suspense>
              </Activity>
              {docsEverOpened.current && (
                <Activity mode={activePanel === 'docs' ? 'visible' : 'hidden'}>
                  <DocsPanel />
                </Activity>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar — relative + z-50 so it sits above the panel (z-40) during animation */}
      <div className="bg-background relative z-50 flex h-12 items-center justify-end overflow-hidden border-t">
        <div className="border-sidebar-border flex h-full items-center gap-1 border-l px-4">
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
        </div>
      </div>
    </div>
  );
}
