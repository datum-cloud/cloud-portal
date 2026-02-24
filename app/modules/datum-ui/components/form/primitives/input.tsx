import { cn } from '@shadcn/lib/utils';
import { Input as ShadcnInput } from '@shadcn/ui/input';
import * as React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnInput
        ref={ref}
        className={cn(
          'rounded-lg',
          'bg-input-background/50',
          'text-input-foreground',
          'border-input-border',
          'placeholder:text-input-placeholder',
          'focus-visible:ring-0 focus-visible:ring-offset-0',
          'focus-visible:border-input-focus-border',
          'focus-visible:shadow-(--input-focus-shadow)',
          'aria-invalid:border-destructive',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
