import * as TooltipPrimitiveRadix from '@radix-ui/react-tooltip';
import { cn } from '@shadcn/lib/utils';
import { Tooltip as TooltipPrimitive, TooltipTrigger } from '@shadcn/ui/tooltip';
import { ReactNode } from 'react';

interface TooltipProps {
  message: string | ReactNode;
  children: ReactNode;
  delayDuration?: number;
  // Advanced props passed to TooltipContent
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  hidden?: boolean;
  // Controlled state props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TooltipContent = ({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitiveRadix.Content>) => {
  return (
    <TooltipPrimitiveRadix.Portal>
      <TooltipPrimitiveRadix.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'tooltip-content',
          'bg-secondary text-secondary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance',
          className
        )}
        {...props}>
        {children}
        <TooltipPrimitiveRadix.Arrow className="bg-secondary fill-secondary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitiveRadix.Content>
    </TooltipPrimitiveRadix.Portal>
  );
};

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
}: TooltipProps) {
  return (
    <TooltipPrimitive delayDuration={delayDuration} open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={sideOffset} hidden={hidden}>
        <span>{message}</span>
      </TooltipContent>
    </TooltipPrimitive>
  );
}
