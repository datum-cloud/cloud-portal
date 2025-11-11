import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipTrigger,
} from '@/modules/shadcn/ui/tooltip';
import { ReactNode } from 'react';

interface TooltipProps {
  message: string | ReactNode;
  children: ReactNode;
  delayDuration?: number;
}

export default function Tooltip({ message, children, delayDuration = 200 }: TooltipProps) {
  return (
    <TooltipPrimitive delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <span>{message}</span>
      </TooltipContent>
    </TooltipPrimitive>
  );
}
