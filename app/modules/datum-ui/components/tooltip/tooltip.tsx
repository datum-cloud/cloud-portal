import * as TooltipPrimitiveRadix from '@radix-ui/react-tooltip';
import { cn } from '@shadcn/lib/utils';
import { Tooltip as TooltipPrimitive, TooltipTrigger } from '@shadcn/ui/tooltip';
import { type ReactNode, useCallback, useRef, useState } from 'react';

interface TooltipProps {
  message: string | ReactNode;
  children: ReactNode;
  delayDuration?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  hidden?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
  arrowClassName?: string;
}

const LONG_PRESS_DURATION = 500;
const AUTO_DISMISS_DURATION = 1500;

const TooltipContent = ({
  className,
  arrowClassName,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitiveRadix.Content> & {
  arrowClassName?: string;
}) => {
  return (
    <TooltipPrimitiveRadix.Portal>
      <TooltipPrimitiveRadix.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'tooltip-content',
          'bg-secondary text-secondary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit max-w-[calc(100vw-2rem)] rounded-md px-3 py-1.5 text-xs text-balance',
          className
        )}
        {...props}>
        {children}
        <TooltipPrimitiveRadix.Arrow
          className={cn(
            'fill-secondary -my-px border-none drop-shadow-[0_1px_0_secondary]',
            arrowClassName
          )}
          width={12}
          height={7}
          aria-hidden="true"
        />
      </TooltipPrimitiveRadix.Content>
    </TooltipPrimitiveRadix.Portal>
  );
};

/**
 * Touch long-press tooltip — renders a simple positioned tooltip bubble
 * completely independent of Radix. This avoids Radix's internal pointer
 * capture which blocks scrolling after tooltip dismissal.
 */
function TouchTooltipBubble({ message, side = 'bottom' }: { message: ReactNode; side?: string }) {
  const positionClass =
    side === 'bottom'
      ? 'top-full mt-1'
      : side === 'left'
        ? 'right-full mr-1 top-1/2 -translate-y-1/2'
        : side === 'right'
          ? 'left-full ml-1 top-1/2 -translate-y-1/2'
          : 'bottom-full mb-1'; // default top

  return (
    <div
      className={cn(
        'animate-in fade-in-0 zoom-in-95 pointer-events-none absolute z-50',
        'bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-xs text-balance',
        'left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2',
        positionClass
      )}
      role="tooltip">
      <span>{message}</span>
    </div>
  );
}

export default function Tooltip({
  message,
  children,
  delayDuration = 200,
  side,
  align,
  sideOffset,
  hidden,
  open,
  onOpenChange,
  contentClassName,
  arrowClassName,
}: TooltipProps) {
  const [longPressVisible, setLongPressVisible] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    clearTimers();
    pressTimerRef.current = setTimeout(() => {
      setLongPressVisible(true);
      dismissTimerRef.current = setTimeout(() => {
        setLongPressVisible(false);
      }, AUTO_DISMISS_DURATION);
    }, LONG_PRESS_DURATION);
  }, [clearTimers]);

  const handleTouchMove = useCallback(() => {
    clearTimers();
    setLongPressVisible(false);
  }, [clearTimers]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleTouchCancel = useCallback(() => {
    clearTimers();
    setLongPressVisible(false);
  }, [clearTimers]);

  return (
    <span
      className="relative inline-flex"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}>
      {/* Radix tooltip for desktop hover — untouched, no controlled open from touch */}
      <TooltipPrimitive delayDuration={delayDuration} open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          hidden={hidden}
          className={contentClassName}
          arrowClassName={arrowClassName}>
          <span>{message}</span>
        </TooltipContent>
      </TooltipPrimitive>

      {/* Touch long-press bubble — completely separate from Radix */}
      {longPressVisible && <TouchTooltipBubble message={message} side={side} />}
    </span>
  );
}
