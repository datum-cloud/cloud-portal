import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@datum-ui/components/sheet';
import { cn } from '@shadcn/lib/utils';
import type { ReactNode } from 'react';

interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional sticky footer content (e.g. "All organizations", "Create project") */
  footer?: ReactNode;
  className?: string;
}

export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: MobileSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn('bg-background max-h-[80svh] gap-0 rounded-t-xl p-0', className)}>
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-muted-foreground text-xs">
              {description}
            </SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="border-t px-3 py-2.5">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
