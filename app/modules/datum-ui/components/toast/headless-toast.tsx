import CloseIcon from '@datum-ui/components/icons/close-icon';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

export type HeadlessToastVariant = 'message' | 'success' | 'error' | 'info' | 'warning';

export type HeadlessToastProps = {
  variant: HeadlessToastVariant;
  title: string;
  description?: React.ReactNode;
  onDismiss: () => void;
};

const variantAccentClass: Record<HeadlessToastVariant, string> = {
  message: 'bg-toast-success-background text-toast-success-foreground',
  info: 'bg-toast-success-background text-toast-success-foreground',
  success: 'bg-toast-success-background text-toast-success-foreground',
  warning: 'bg-toast-error-background text-toast-error-foreground',
  error: 'bg-toast-error-background text-toast-error-foreground',
};

const variantIconClass: Record<HeadlessToastVariant, string> = {
  message: 'fill-toast-success-icon',
  info: 'fill-toast-success-icon',
  success: 'fill-toast-success-icon',
  warning: 'fill-toast-error-icon',
  error: 'fill-toast-error-icon',
};

export function HeadlessToast({ variant, title, description, onDismiss }: HeadlessToastProps) {
  return (
    <div
      className={cn(
        'bg-background text-foreground pointer-events-auto w-90 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[10px]',
        'grid grid-cols-[1fr_auto] px-5 py-4 text-xs',
        variantAccentClass[variant]
      )}>
      <div className="relative flex w-full flex-col gap-1">
        <div className="font-semibold">{title}</div>
        {description ? <div>{description}</div> : null}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="absolute -top-1 -right-2 transition-opacity hover:opacity-90">
          <CloseIcon className="size-4.5" fill={variantIconClass[variant]} />
        </button>
      </div>
    </div>
  );
}
