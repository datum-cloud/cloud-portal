import { CloseIcon } from '@datum-ui/components/icons/close-icon';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cn } from '@shadcn/lib/utils';
import {
  Sheet as ShadcnSheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shadcn/ui/sheet';
import * as React from 'react';

/* -----------------------------------------------------------------------------
 * Re-exports from shadcn (unchanged)
 * -------------------------------------------------------------------------- */

export const SheetClose = SheetPrimitive.Close;

/* -----------------------------------------------------------------------------
 * Sheet Overlay – matches dialog overlay (datum-ui Dialog)
 * -------------------------------------------------------------------------- */

interface SheetOverlayProps extends React.ComponentProps<typeof SheetPrimitive.Overlay> {}

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-dialog-overlay/50 fixed inset-0 z-50 backdrop-blur-[2px]',
        className
      )}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * Sheet Content – same layout as shadcn, with dialog-style close button
 * -------------------------------------------------------------------------- */

interface SheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: 'top' | 'right' | 'bottom' | 'left';
}

function SheetContent({ className, children, side = 'right', ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className
        )}
        {...props}>
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0">
          <CloseIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

/* -----------------------------------------------------------------------------
 * Compound export – typed so Sheet.Trigger, Sheet.Content, etc. are valid
 * -------------------------------------------------------------------------- */

interface SheetComponent extends React.FC<React.ComponentProps<typeof ShadcnSheet>> {
  Trigger: typeof SheetTrigger;
  Content: typeof SheetContent;
  Close: typeof SheetClose;
  Header: typeof SheetHeader;
  Footer: typeof SheetFooter;
  Title: typeof SheetTitle;
  Description: typeof SheetDescription;
}

export const Sheet: SheetComponent = Object.assign(ShadcnSheet, {
  Trigger: SheetTrigger,
  Content: SheetContent,
  Close: SheetClose,
  Header: SheetHeader,
  Footer: SheetFooter,
  Title: SheetTitle,
  Description: SheetDescription,
});

export {
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
};
