import { cn } from '@shadcn/lib/utils';
import {
  Dialog as ShadcnDialog,
  DialogClose,
  DialogContent as ShadcnDialogContent,
  DialogDescription,
  DialogFooter as ShadcnDialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@shadcn/ui/dialog';
import { CircleXIcon } from 'lucide-react';
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
    <ShadcnDialogContent
      className={cn(
        'dark:bg-background flex max-h-[80vh] flex-col gap-0 bg-white p-0 [&>button:last-child]:hidden',
        className
      )}>
      {children}
    </ShadcnDialogContent>
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
}

function Header({ title, description, onClose, className }: DialogHeaderProps) {
  return (
    <div className={cn('relative flex flex-col gap-2 p-5', className)}>
      <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
      {description && (
        <DialogDescription className="text-sm font-normal">{description}</DialogDescription>
      )}

      {onClose && (
        <DialogClose className="absolute top-4 right-4 cursor-pointer" onClick={onClose} asChild>
          <CircleXIcon className="fill-secondary/20 text-secondary-foreground hover:fill-secondary hover:text-secondary-foreground size-6 cursor-pointer transition-all" />
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
  return <div className={cn('flex-1 overflow-y-auto py-5', className)}>{children}</div>;
}

/* -----------------------------------------------------------------------------
 * Dialog Footer
 * -------------------------------------------------------------------------- */

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: DialogFooterProps) {
  return <ShadcnDialogFooter className={cn('gap-3 p-5', className)}>{children}</ShadcnDialogFooter>;
}

/* -----------------------------------------------------------------------------
 * Compound Component Export
 * -------------------------------------------------------------------------- */

Dialog.Trigger = Trigger;
Dialog.Content = Content;
Dialog.Header = Header;
Dialog.Body = Body;
Dialog.Footer = Footer;

export { Dialog };
export type {
  DialogProps,
  DialogTriggerProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogFooterProps,
};
