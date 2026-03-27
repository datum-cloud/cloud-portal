import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@datum-ui/components/dropdown';
import { MobileSheet } from '@datum-ui/components/mobile-sheet';
import { cn } from '@shadcn/lib/utils';
import type { ReactNode } from 'react';

interface ResponsiveDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;

  /** Title shown in the mobile sheet header */
  sheetTitle: string;
  /** Description for the mobile sheet */
  sheetDescription?: string;

  /** DropdownMenuContent props (desktop only) */
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;

  /** Called when DropdownMenuContent auto-focuses on close */
  onCloseAutoFocus?: (e: Event) => void;
}

export function ResponsiveDropdown({
  open,
  onOpenChange,
  trigger,
  children,
  sheetTitle,
  sheetDescription,
  align = 'end',
  contentClassName,
  onCloseAutoFocus,
}: ResponsiveDropdownProps) {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  if (isMobile) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenChange(!open)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenChange(!open);
            }
          }}>
          {trigger}
        </div>
        <MobileSheet
          open={open}
          onOpenChange={onOpenChange}
          title={sheetTitle}
          description={sheetDescription}>
          {children}
        </MobileSheet>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn('rounded-lg p-0', contentClassName)}
        onCloseAutoFocus={onCloseAutoFocus}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
