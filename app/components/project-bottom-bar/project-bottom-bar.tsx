import { useProjectContext } from '@/providers/project.provider';
import { Button } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import Tooltip from '@datum-ui/components/tooltip/tooltip';
import { cn } from '@shadcn/lib/utils';
import { BookOpen, Brain, Terminal, type LucideIcon } from 'lucide-react';
import { Activity, lazy, Suspense, useState } from 'react';

const TerminalPanel = lazy(() =>
  import('./terminal-panel').then((m) => ({ default: m.TerminalPanel }))
);

const ChatPanel = lazy(() => import('./chat/chat-panel').then((m) => ({ default: m.ChatPanel })));

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

const ANIMATION_DURATION = 300;

export function ProjectBottomBar() {
  const { project } = useProjectContext();
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(400);

  const closePanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActivePanel(null);
      setIsClosing(false);
    }, ANIMATION_DURATION);
  };

  const handlePanelToggle = (panel: PanelType) => {
    if (activePanel === panel) {
      closePanel();
    } else {
      setIsClosing(false);
      setActivePanel(panel);
    }
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
      {(activePanel || isClosing) && (
        <div
          className={cn(
            'dark:bg-accent bg-card absolute right-0 bottom-full left-0 z-40 flex flex-col border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] [clip-path:inset(-20px_0_0_0)]',
            isClosing
              ? 'animate-out slide-out-to-bottom duration-300'
              : 'animate-in slide-in-from-bottom duration-300'
          )}
          style={{ height: panelHeight }}>
          {/* Drag handle + close button */}
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
            <Activity mode={activePanel === 'terminal' ? 'visible' : 'hidden'}>
              {/* <Suspense fallback={<div className="h-full w-full" />}>
                <TerminalPanel />
              </Suspense> */}
              <div className="bg-muted flex h-full w-full items-center justify-center">
                <h2>Datum CLI Comming Soon</h2>
              </div>
            </Activity>
            <Activity mode={activePanel === 'chat' ? 'visible' : 'hidden'}>
              <Suspense fallback={<div className="h-full w-full" />}>
                <ChatPanel key={project?.name ?? 'no-project'} />
              </Suspense>
            </Activity>
            <Activity mode={activePanel === 'docs' ? 'visible' : 'hidden'}>
              <DocsPanel />
            </Activity>
          </div>
        </div>
      )}

      {/* Toolbar — relative + z-50 so it sits above the panel (z-40) during animation */}
      <div className="bg-background relative z-50 flex h-12 items-center justify-end overflow-hidden border-t">
        <div className="border-sidebar-border flex h-full items-center gap-1 border-l px-4">
          <span className="text-foreground mr-2 text-xs">Developer Tools</span>
          <ToolbarButton
            panel="chat"
            icon={Brain}
            label="AI Chat"
            isActive={activePanel === 'chat'}
            onClick={handlePanelToggle}
          />
          <ToolbarButton
            panel="terminal"
            icon={Terminal}
            label="Terminal"
            isActive={activePanel === 'terminal'}
            onClick={handlePanelToggle}
          />
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
