import { cn } from '@datum-cloud/datum-ui/utils';
import { Brain, ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';

export function ThinkingBlock({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const startedAt = useRef<number | null>(null);
  const duration = useRef<number | null>(null);

  // Compute timing inline — no useEffect needed
  if (isStreaming && startedAt.current === null) {
    startedAt.current = Date.now();
  }
  if (!isStreaming && startedAt.current !== null && duration.current === null) {
    duration.current = Math.round((Date.now() - startedAt.current) / 1000);
  }

  const label = isStreaming
    ? 'Thinking…'
    : duration.current !== null
      ? duration.current < 1
        ? 'Thought for less than 1 second'
        : `Thought for ${duration.current}s`
      : 'Thought';

  return (
    <div className="mb-3">
      <button
        onClick={() => !isStreaming && setOpen((o) => !o)}
        disabled={isStreaming}
        className={cn(
          'text-muted-foreground flex items-center gap-1.5 text-xs transition-colors',
          !isStreaming && 'hover:text-foreground cursor-pointer',
          isStreaming && 'cursor-default'
        )}>
        <Brain className={cn('size-3.5 shrink-0', isStreaming && 'animate-pulse')} />
        <span>{label}</span>
        {!isStreaming && (
          <ChevronDown
            className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
          />
        )}
      </button>

      {/* Smooth expand / collapse via CSS grid */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          open && !isStreaming ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}>
        <div className="overflow-hidden">
          <div className="text-muted-foreground/75 border-muted-foreground/20 mt-2 border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
