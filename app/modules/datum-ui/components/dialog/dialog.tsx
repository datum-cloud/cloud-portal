import { CloseIcon } from '@datum-ui/components/icons/close-icon';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@shadcn/lib/utils';
import {
  Dialog as ShadcnDialog,
  DialogClose,
  DialogDescription,
  DialogFooter as ShadcnDialogFooter,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DialogOverlay as ShadcnDialogOverlay,
} from '@shadcn/ui/dialog';
import * as React from 'react';

/* -----------------------------------------------------------------------------
 * Dialog Root
 * -------------------------------------------------------------------------- */

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Dialog({ children, ...props }: DialogProps) {
  return <ShadcnDialog {...props}>{children}</ShadcnDialog>;
}

/* -----------------------------------------------------------------------------
 * Dialog Overlay
 * -------------------------------------------------------------------------- */

interface DialogOverlayProps {
  className?: string;
}

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <ShadcnDialogOverlay
      className={cn('bg-dialog-overlay/50 backdrop-blur-[2px]', className)}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * Dialog Trigger
 * -------------------------------------------------------------------------- */

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function Trigger({ children, asChild = true }: DialogTriggerProps) {
  return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>;
}

/* -----------------------------------------------------------------------------
 * Dialog Content
 * -------------------------------------------------------------------------- */

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

function Content({ children, className }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'dark:bg-muted dark:border-dialog-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[80vh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-y-auto rounded-lg bg-white p-0 shadow-xl duration-200 sm:max-w-lg dark:border [&>button:last-child]:hidden',
          className
        )}>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/* -----------------------------------------------------------------------------
 * Dialog Header
 * -------------------------------------------------------------------------- */

interface DialogHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  descriptionClassName?: string;
}

function Header({
  title,
  description,
  onClose,
  className,
  descriptionClassName,
}: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'dark:bg-muted dark:border-dialog-border sticky top-0 z-50 flex shrink-0 flex-col gap-2 bg-white p-5',
        className
      )}>
      <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
      {description && (
        <DialogDescription className={cn('text-sm font-normal', descriptionClassName)}>
          {description}
        </DialogDescription>
      )}

      {onClose && (
        <DialogClose className="absolute top-4 right-4 cursor-pointer" onClick={onClose}>
          <CloseIcon />
        </DialogClose>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Dialog Body
 * -------------------------------------------------------------------------- */

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

function Body({ children, className }: DialogBodyProps) {
  return <div className={cn('py-5', className)}>{children}</div>;
}

/* -----------------------------------------------------------------------------
 * Dialog Footer
 * -------------------------------------------------------------------------- */

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: DialogFooterProps) {
  return (
    <ShadcnDialogFooter
      className={cn(
        'dark:bg-muted dark:border-dialog-border sticky bottom-0 z-50 shrink-0 gap-3 bg-white p-5',
        className
      )}>
      {children}
    </ShadcnDialogFooter>
  );
}

/* -----------------------------------------------------------------------------
 * Compound Component Export
 * -------------------------------------------------------------------------- */

Dialog.Trigger = Trigger;
Dialog.Content = Content;
Dialog.Header = Header;
Dialog.Body = Body;
Dialog.Footer = Footer;
Dialog.Overlay = DialogOverlay;

export { Dialog };
export type {
  DialogProps,
  DialogTriggerProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogFooterProps,
};
