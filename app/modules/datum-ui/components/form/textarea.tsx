import { cn } from '@shadcn/lib/utils';
import { Textarea as ShadcnTextarea } from '@shadcn/ui/textarea';
import * as React from 'react';

/**
 * Datum Textarea component - extends shadcn Textarea with Datum-specific styling
 *
 * This component wraps the shadcn Textarea and allows for Datum-specific
 * class customizations without modifying the core shadcn component.
 *
 * @example
 * ```tsx
 * <Textarea
 *   className="custom-class"
 *   placeholder="Enter description..."
 *   rows={4}
 * />
 * ```
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnTextarea
        ref={ref}
        className={cn(
          // Datum-specific customizations can be added here
          // These classes will merge with shadcn defaults
          'rounded-lg',
          'bg-input-background/50',
          'text-input-foreground',
          'border-input-border',
          'placeholder:text-input-placeholder',
          // Remove ring and add custom box-shadow on focus
          'focus-visible:ring-0 focus-visible:ring-offset-0',
          'focus-visible:border-input-focus-border',
          'focus-visible:shadow-(--input-focus-shadow)',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
