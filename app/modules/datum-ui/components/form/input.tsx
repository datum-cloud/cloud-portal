import { cn } from '@shadcn/lib/utils';
import { Input as ShadcnInput } from '@shadcn/ui/input';
import * as React from 'react';

/**
 * Datum Input component - extends shadcn Input with Datum-specific styling
 *
 * This component wraps the shadcn Input and allows for Datum-specific
 * class customizations without modifying the core shadcn component.
 *
 * @example
 * ```tsx
 * <Input
 *   className="custom-class"
 *   placeholder="Enter text..."
 *   type="text"
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnInput
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

Input.displayName = 'Input';

export { Input };
